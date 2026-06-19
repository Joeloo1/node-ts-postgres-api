import Stripe from "stripe";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";
import { emailQueue } from "../jobs/emailQueue";
import { adminNotify } from "../utils/adminNotify";
import { cancelCartAbandonment } from "../jobs/cartAbandonmentQueue";
import { redeemLoyaltyPoints } from "./loyaltyController";

type StripeClient = InstanceType<typeof Stripe>;
let _stripe: StripeClient | null = null;
const getStripe = (): StripeClient => {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key)
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    _stripe = new Stripe(key);
  }
  return _stripe;
};

export const createCheckoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const clientUrl = process.env.CLIENT_URL ?? "http://localhost:5173";
    const { couponCode, giftCardCode, pointsToRedeem } = req.body as {
      couponCode?: string;
      giftCardCode?: string;
      pointsToRedeem?: number;
    };

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });

    if (!cart || cart.items.length === 0)
      return next(new AppError("Your cart is empty", 400));

    // Validate stock before sending the user to Stripe
    for (const item of cart.items) {
      const availableStock = item.variant ? item.variant.stock : item.product.stock;
      if (availableStock < item.quantity) {
        return next(
          new AppError(
            `Insufficient stock for "${item.product.name}"${item.variant ? ` (${item.variant.name})` : ""}. Only ${availableStock} left.`,
            400,
          ),
        );
      }
    }

    // Auto-apply shipping zone based on user's default address
    let checkoutShippingCost = 0;
    const userDefaultAddress = await prisma.address.findFirst({
      where: { userId, isDefault: true },
      select: { country: true },
    });
    if (userDefaultAddress?.country) {
      const zone = await prisma.shippingZone.findFirst({
        where: { active: true, countries: { has: userDefaultAddress.country } },
      });
      if (zone) {
        const subtotal = cart.items.reduce((sum, item) => {
          const m = item.product.discount ? 1 - item.product.discount / 100 : 1;
          const base = item.product.price + (item.variant?.priceModifier ?? 0);
          return sum + base * m * item.quantity;
        }, 0);
        checkoutShippingCost =
          zone.freeThreshold != null && subtotal >= zone.freeThreshold
            ? 0
            : zone.flatRate;
      }
    }

    // Fetch active promotions to apply additional discounts
    const now = new Date();
    const activePromotions = await prisma.promotion.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
    });

    let totalPromotionDiscount = 0;

    const lineItems = cart.items.map((item) => {
      const productDiscountMultiplier = item.product.discount
        ? 1 - item.product.discount / 100
        : 1;
      const basePrice = item.product.price + (item.variant?.priceModifier ?? 0);
      const priceAfterProductDiscount = basePrice * productDiscountMultiplier;

      // Find the best applicable promotion for this item
      let bestPromoDiscount = 0;
      for (const promo of activePromotions) {
        if (promo.type === "FLASH_SALE") {
          bestPromoDiscount = Math.max(bestPromoDiscount, promo.value);
        } else if (
          promo.type === "PERCENTAGE_OFF_CATEGORY" &&
          promo.categoryId === item.product.category_id
        ) {
          bestPromoDiscount = Math.max(bestPromoDiscount, promo.value);
        }
      }

      const promoMultiplier = bestPromoDiscount > 0 ? 1 - bestPromoDiscount / 100 : 1;
      const finalUnitPrice = priceAfterProductDiscount * promoMultiplier;
      const unitAmount = Math.round(finalUnitPrice * 100);

      if (bestPromoDiscount > 0) {
        totalPromotionDiscount +=
          (priceAfterProductDiscount - finalUnitPrice) * item.quantity;
      }

      const displayName = item.variant
        ? `${item.product.name} — ${item.variant.name}`
        : item.product.name;
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: displayName,
            ...(item.product.image?.startsWith("http") && {
              images: [item.product.image],
            }),
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      };
    });

    // Add shipping as a line item if applicable
    if (checkoutShippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping" },
          unit_amount: Math.round(checkoutShippingCost * 100),
        },
        quantity: 1,
      });
    }

    // Calculate subtotal for discount validation (post product-discount, pre-promotion)
    const subtotal = cart.items.reduce((sum, item) => {
      const m = item.product.discount ? 1 - item.product.discount / 100 : 1;
      const base = item.product.price + (item.variant?.priceModifier ?? 0);
      return sum + base * m * item.quantity;
    }, 0);

    let totalExtraDiscount = 0;
    let validCouponCode: string | undefined;
    let validGiftCardCode: string | undefined;
    let validGiftCardDiscount = 0;
    let validPointsToRedeem = 0;

    // Coupon
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });
      if (
        coupon &&
        coupon.active &&
        (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
        (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
        (coupon.minOrderTotal === null || subtotal >= coupon.minOrderTotal)
      ) {
        const couponDollar =
          coupon.type === "PERCENTAGE"
            ? (subtotal * coupon.value) / 100
            : Math.min(coupon.value, subtotal);
        totalExtraDiscount += couponDollar;
        validCouponCode = coupon.code;
      }
    }

    // Gift card
    if (giftCardCode) {
      const gc = await prisma.giftCard.findUnique({
        where: { code: giftCardCode.toUpperCase() },
      });
      if (
        gc &&
        gc.active &&
        gc.balance > 0 &&
        (!gc.expiresAt || gc.expiresAt > new Date())
      ) {
        const redeemable = Math.min(
          gc.balance,
          subtotal + checkoutShippingCost - totalExtraDiscount,
        );
        if (redeemable > 0) {
          validGiftCardCode = gc.code;
          validGiftCardDiscount = Math.round(redeemable * 100) / 100;
          totalExtraDiscount += validGiftCardDiscount;
        }
      }
    }

    // Loyalty points (minimum 100 points = $1)
    if (pointsToRedeem && pointsToRedeem >= 100) {
      const loyaltyAccount = await prisma.loyaltyAccount.findUnique({
        where: { userId },
      });
      if (loyaltyAccount && loyaltyAccount.points >= pointsToRedeem) {
        const loyaltyDollar = Math.floor(pointsToRedeem / 100);
        const cappedLoyalty = Math.min(
          loyaltyDollar,
          subtotal + checkoutShippingCost - totalExtraDiscount,
        );
        if (cappedLoyalty > 0) {
          validPointsToRedeem = Math.floor(cappedLoyalty) * 100;
          totalExtraDiscount += cappedLoyalty;
        }
      }
    }

    // Combine all non-promotion discounts into a single Stripe amount_off coupon
    let stripeDiscounts: { coupon: string }[] | undefined;
    if (totalExtraDiscount > 0) {
      const sc = await getStripe().coupons.create({
        amount_off: Math.round(totalExtraDiscount * 100),
        currency: "usd",
        duration: "once",
      });
      stripeDiscounts = [{ coupon: sc.id }];
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      metadata: {
        userId,
        ...(validCouponCode && { couponCode: validCouponCode }),
        ...(totalPromotionDiscount > 0 && {
          promotionDiscount: totalPromotionDiscount.toFixed(2),
        }),
        ...(checkoutShippingCost > 0 && {
          shippingCost: checkoutShippingCost.toFixed(2),
        }),
        ...(validGiftCardCode && {
          giftCardCode: validGiftCardCode,
          giftCardDiscount: validGiftCardDiscount.toFixed(2),
        }),
        ...(validPointsToRedeem > 0 && {
          loyaltyPointsRedeemed: String(validPointsToRedeem),
        }),
      },
      ...(stripeDiscounts && { discounts: stripeDiscounts }),
      success_url: `${clientUrl}/orders/confirmation/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/cart`,
    });

    logger.info("Stripe Checkout Session created", {
      userId,
      sessionId: session.id,
      amount: session.amount_total,
      coupon: validCouponCode,
    });

    res.status(200).json({
      status: "success",
      data: { url: session.url },
    });
  },
);

const fulfillCartOrder = async (
  userId: string,
  sessionId: string,
  couponCode?: string,
  promotionDiscount = 0,
  shippingCost = 0,
  loyaltyPointsRedeemed = 0,
  giftCardCode?: string,
  giftCardDiscount = 0,
) => {
  // Captured outside transaction so we can use after commit
  let isNewOrder = false;
  const confirmedItems: { name: string; quantity: number; price: string }[] = [];

  // Fetch default address before transaction so we can populate shipping fields on the order
  const defaultAddress = await prisma.address.findFirst({
    where: { userId, isDefault: true },
  });
  const addressOwner = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });

  const order = await prisma.$transaction(async (tx) => {
    // Idempotency check — if this session was already fulfilled, return existing order
    const existing = await tx.order.findUnique({
      where: { stripeSessionId: sessionId },
      include: { items: true },
    });
    if (existing) {
      logger.info("Stripe webhook already fulfilled — returning existing order (idempotent)", {
        sessionId,
        orderId: existing.id,
      });
      return existing;
    }

    const cart = await tx.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });

    if (!cart || cart.items.length === 0) return null;

    let calculatedTotal = 0;
    const orderItemsData: {
      product_id: string;
      quantity: number;
      price: number;
      variantId?: string;
      variantName?: string;
    }[] = [];

    for (const item of cart.items) {
      const { product, variant } = item;
      const availableStock = variant ? variant.stock : product.stock;
      if (availableStock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${product.name}"${variant ? ` (${variant.name})` : ""} at fulfilment time`,
        );
      }

      // Decrement stock and auto-toggle availability
      if (variant) {
        const updatedVariant = await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { decrement: item.quantity } },
          select: { stock: true },
        });
        if (updatedVariant.stock === 0) {
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { availability: false },
          });
        }
      } else {
        const updatedProduct = await tx.products.update({
          where: { product_id: item.product_id },
          data: { stock: { decrement: item.quantity } },
          select: { stock: true },
        });
        if (updatedProduct.stock === 0) {
          await tx.products.update({
            where: { product_id: item.product_id },
            data: { availability: false },
          });
        }
      }

      const discountMultiplier = product.discount
        ? 1 - product.discount / 100
        : 1;
      const basePrice = product.price + (variant?.priceModifier ?? 0);
      const linePrice = Math.round(basePrice * discountMultiplier * 100) / 100;

      calculatedTotal += linePrice * item.quantity;
      orderItemsData.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: linePrice,
        ...(variant && { variantId: variant.id, variantName: variant.name }),
      });

      // Build email line items (product names available here)
      confirmedItems.push({
        name: variant
          ? `${product.name} — ${variant.name}`
          : product.name,
        quantity: item.quantity,
        price: linePrice.toFixed(2),
      });
    }

    let discountAmount = promotionDiscount + giftCardDiscount + loyaltyPointsRedeemed / 100;
    if (couponCode) {
      const coupon = await tx.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });
      if (
        coupon &&
        coupon.active &&
        (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
        (coupon.maxUses === null || coupon.usedCount < coupon.maxUses)
      ) {
        discountAmount =
          coupon.type === "PERCENTAGE"
            ? (calculatedTotal * coupon.value) / 100
            : Math.min(coupon.value, calculatedTotal);
        await tx.coupon.update({
          where: { code: coupon.code },
          data: { usedCount: { increment: 1 } },
        });
      }
    }

    const finalTotal =
      Math.round(Math.max(0, calculatedTotal - discountAmount) * 100) / 100;

    const newOrder = await tx.order.create({
      data: {
        userId,
        total: finalTotal,
        status: "PAID",
        stripeSessionId: sessionId,
        discountAmount,
        shippingCost,
        ...(couponCode && discountAmount > 0 && { couponCode }),
        // Auto-populate shipping address from the user's default address
        ...(defaultAddress && {
          shippingName: addressOwner?.name ?? null,
          shippingStreet: defaultAddress.street,
          shippingCity: defaultAddress.city,
          shippingState: defaultAddress.state ?? null,
          shippingZip: defaultAddress.zipCode ?? null,
          shippingCountry: defaultAddress.country ?? null,
        }),
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Gift card redemption — decrement balance
    if (giftCardCode && giftCardDiscount > 0) {
      await tx.giftCard.update({
        where: { code: giftCardCode.toUpperCase() },
        data: { balance: { decrement: giftCardDiscount } },
      });
      await tx.giftCardRedemption.create({
        data: { giftCardId: (await tx.giftCard.findUnique({ where: { code: giftCardCode.toUpperCase() }, select: { id: true } }))!.id, orderId: newOrder.id, amount: giftCardDiscount },
      });
    }

    isNewOrder = true;
    return newOrder;
  });

  // Loyalty points redemption (outside transaction — non-critical)
  if (isNewOrder && order && loyaltyPointsRedeemed > 0) {
    redeemLoyaltyPoints(userId, loyaltyPointsRedeemed, order.id).catch(() => {});
  }

  // Cancel cart abandonment job — user completed checkout
  cancelCartAbandonment(userId).catch(() => {});

  // Queue confirmation email only for newly created orders (not on idempotent replay)
  if (isNewOrder && order) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });
      if (user) {
        await emailQueue.add("send-email", {
          email: user.email,
          subject: "Your Northline order is confirmed! 🎉",
          template: "orderConfirmed",
          templateData: {
            name: user.name,
            orderId: order.id.slice(0, 8).toUpperCase(),
            total: order.total.toFixed(2),
            discountAmount:
              order.discountAmount > 0
                ? order.discountAmount.toFixed(2)
                : null,
            items: confirmedItems,
            orderUrl: `${process.env.CLIENT_URL}/orders/${order.id}`,
            year: new Date().getFullYear(),
          },
        });
      }
    } catch (err) {
      logger.warn("Failed to queue order confirmation email", {
        orderId: order.id,
        err,
      });
    }

    adminNotify(
      "NEW_ORDER",
      `New order #${order.id.slice(0, 8).toUpperCase()} — $${order.total.toFixed(2)}`,
      { orderId: order.id, userId },
    );
  }

  return order;
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) return res.status(400).send("Missing Stripe signature header");

  let event: ReturnType<StripeClient["webhooks"]["constructEvent"]>;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    logger.warn("Stripe webhook signature verification failed", { err });
    return res.status(400).send("Webhook signature verification failed");
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      metadata?: Record<string, string>;
      payment_status: string;
    };

    if (session.payment_status !== "paid") {
      return res.status(200).json({ received: true });
    }

    const userId = session.metadata?.userId;

    if (!userId) {
      logger.error("checkout.session.completed missing userId in metadata", {
        sessionId: session.id,
      });
      return res.status(200).json({ received: true });
    }

    const couponCodeMeta = session.metadata?.couponCode;
    const promotionDiscountMeta = parseFloat(session.metadata?.promotionDiscount ?? "0");
    const shippingCostMeta = parseFloat(session.metadata?.shippingCost ?? "0");
    const loyaltyPointsMeta = parseInt(session.metadata?.loyaltyPointsRedeemed ?? "0", 10);
    const giftCardCodeMeta = session.metadata?.giftCardCode;
    const giftCardDiscountMeta = parseFloat(session.metadata?.giftCardDiscount ?? "0");

    try {
      const order = await fulfillCartOrder(
        userId,
        session.id,
        couponCodeMeta,
        promotionDiscountMeta,
        shippingCostMeta,
        loyaltyPointsMeta,
        giftCardCodeMeta,
        giftCardDiscountMeta,
      );
      if (order) {
        logger.info("Order fulfilled via Stripe Checkout", {
          userId,
          orderId: order.id,
          total: order.total,
        });
      } else {
        logger.warn("Cart was empty at fulfilment time", {
          userId,
          sessionId: session.id,
        });
      }
    } catch (err) {
      // Return 200 — non-2xx causes Stripe to retry, risking double-fulfil
      logger.error("Order fulfilment failed after Checkout payment", {
        userId,
        sessionId: session.id,
        error: err,
      });
    }
  }

  // ── payment_intent.payment_failed ──────────────────────────────────────────
  if (event.type === "payment_intent.payment_failed") {
    const pi = event.data.object as { id: string };
    try {
      const sessions = await getStripe().checkout.sessions.list({
        payment_intent: pi.id,
        limit: 1,
      });
      const sessionId = sessions.data[0]?.id;
      if (sessionId) {
        // Mark any PENDING order for this session as CANCELLED
        const { count } = await prisma.order.updateMany({
          where: { stripeSessionId: sessionId, status: "PENDING" },
          data: { status: "CANCELLED" },
        });
        if (count > 0) {
          logger.info("Pending order cancelled after payment failure", { sessionId });
        }
      }
    } catch (err) {
      logger.error("Error handling payment_intent.payment_failed", { piId: pi.id, err });
    }
  }

  // ── charge.refunded ────────────────────────────────────────────────────────
  if (event.type === "charge.refunded") {
    const charge = event.data.object as { payment_intent?: string | null };
    if (charge.payment_intent) {
      try {
        const sessions = await getStripe().checkout.sessions.list({
          payment_intent: charge.payment_intent,
          limit: 1,
        });
        const sessionId = sessions.data[0]?.id;
        if (sessionId) {
          const order = await prisma.order.findUnique({
            where: { stripeSessionId: sessionId },
            include: { user: { select: { email: true, name: true } } },
          });
          if (order && order.status !== "REFUNDED") {
            await prisma.order.update({
              where: { id: order.id },
              data: { status: "REFUNDED" },
            });
            await emailQueue
              .add("send-email", {
                email: order.user.email,
                subject: "Your Northline refund has been processed",
                template: "orderStatus",
                templateData: {
                  name: order.user.name,
                  orderId: order.id.slice(0, 8).toUpperCase(),
                  statusLabel: "Refunded",
                  statusMessage:
                    "Your refund has been processed. Funds will appear in your account within 5-10 business days.",
                  trackingNumber: null,
                },
              })
              .catch((err) => logger.warn("Failed to queue refund email", { err }));
            logger.info("Order marked REFUNDED", { orderId: order.id });
          }
        }
      } catch (err) {
        logger.error("Error handling charge.refunded", { err });
      }
    }
  }

  res.status(200).json({ received: true });
};

export const verifyCheckoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    let session: {
      payment_status: string;
      metadata?: Record<string, string> | null;
    };
    try {
      session = await getStripe().checkout.sessions.retrieve(sessionId);
    } catch {
      return next(new AppError("Checkout session not found", 404));
    }

    if (session.metadata?.userId !== userId) {
      return next(new AppError("Session does not belong to this account", 403));
    }

    if (session.payment_status !== "paid") {
      return next(
        new AppError("Payment has not been completed for this session", 402),
      );
    }

    const couponCodeMeta = session.metadata?.couponCode ?? undefined;
    const promotionDiscountMeta = parseFloat(session.metadata?.promotionDiscount ?? "0");
    const shippingCostMeta = parseFloat(session.metadata?.shippingCost ?? "0");
    const loyaltyPointsMeta2 = parseInt(session.metadata?.loyaltyPointsRedeemed ?? "0", 10);
    const giftCardCodeMeta2 = session.metadata?.giftCardCode;
    const giftCardDiscountMeta2 = parseFloat(session.metadata?.giftCardDiscount ?? "0");
    let order = null;
    try {
      order = await fulfillCartOrder(
        userId,
        sessionId,
        couponCodeMeta,
        promotionDiscountMeta,
        shippingCostMeta,
        loyaltyPointsMeta2,
        giftCardCodeMeta2,
        giftCardDiscountMeta2,
      );
    } catch (err) {
      logger.warn(
        "verifyCheckoutSession fulfillment failed — looking for existing order",
        { userId, sessionId, error: err },
      );
    }

    if (!order) {
      order = await prisma.order.findUnique({
        where: { stripeSessionId: sessionId },
        include: { items: { include: { product: true } } },
      });
    }

    if (!order) {
      return next(
        new AppError("Order not found — please contact support", 404),
      );
    }

    logger.info("Checkout session verified", { userId, orderId: order.id });

    res.status(200).json({ status: "success", data: { order } });
  },
);
