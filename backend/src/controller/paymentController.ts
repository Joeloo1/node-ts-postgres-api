import Stripe from "stripe";
import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";

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
    const { couponCode } = req.body as { couponCode?: string };

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

    // Build Stripe line items with product-level discounts and variant price modifiers applied
    const lineItems = cart.items.map((item) => {
      const discountMultiplier = item.product.discount
        ? 1 - item.product.discount / 100
        : 1;
      const basePrice = item.product.price + (item.variant?.priceModifier ?? 0);
      const unitAmount = Math.round(basePrice * discountMultiplier * 100);
      const displayName = item.variant
        ? `${item.product.name} — ${item.variant.name}`
        : item.product.name;
      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: displayName,
            // Only pass absolute URLs — local /public paths are not reachable by Stripe
            ...(item.product.image?.startsWith("http") && {
              images: [item.product.image],
            }),
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      };
    });

    // Validate coupon and create a one-time Stripe coupon if applicable
    let stripeDiscounts: { coupon: string }[] | undefined;
    let validCouponCode: string | undefined;

    if (couponCode) {
      const subtotal = cart.items.reduce((sum, item) => {
        const m = item.product.discount ? 1 - item.product.discount / 100 : 1;
        const base = item.product.price + (item.variant?.priceModifier ?? 0);
        return sum + base * m * item.quantity;
      }, 0);

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
        // Create a one-time Stripe coupon object so Stripe shows the correct total
        const stripeCoupon = await getStripe().coupons.create(
          coupon.type === "PERCENTAGE"
            ? { percent_off: coupon.value, duration: "once" }
            : {
                amount_off: Math.round(coupon.value * 100),
                currency: "usd",
                duration: "once",
              },
        );
        stripeDiscounts = [{ coupon: stripeCoupon.id }];
        validCouponCode = coupon.code;
      }
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      metadata: {
        userId,
        ...(validCouponCode && { couponCode: validCouponCode }),
      },
      ...(stripeDiscounts && { discounts: stripeDiscounts }),
      // Stripe injects the session ID into the path — frontend reads it via useParams
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
) => {
  return prisma.$transaction(async (tx) => {
    // Idempotency check — if this session was already fulfilled, return the existing order
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

      // Decrement stock on the right record
      if (variant) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { decrement: item.quantity } },
        });
      } else {
        await tx.products.update({
          where: { product_id: item.product_id },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Apply product-level discount + variant price modifier (mirrors createCheckoutSession)
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
    }

    // Apply coupon discount atomically — same logic as createOrder
    let discountAmount = 0;
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

    const order = await tx.order.create({
      data: {
        userId,
        total: finalTotal,
        status: "PAID",
        stripeSessionId: sessionId,
        discountAmount,
        ...(couponCode && discountAmount > 0 && { couponCode }),
        items: { create: orderItemsData },
      },
      include: { items: true },
    });

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return order;
  });
};

export const stripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;

  if (!sig) return res.status(400).send("Missing Stripe signature header");

  let event: ReturnType<StripeClient["webhooks"]["constructEvent"]>;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body, // raw Buffer — express.raw() must wrap this route
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    logger.warn("Stripe webhook signature verification failed", { err });
    return res.status(400).send("Webhook signature verification failed");
  }

  // Only act on successful Checkout Sessions
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as {
      id: string;
      metadata?: Record<string, string>;
      payment_status: string;
    };

    // Only fulfil paid sessions (not e.g. "unpaid" bank transfer sessions)
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

    try {
      const order = await fulfillCartOrder(userId, session.id, couponCodeMeta);
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

  res.status(200).json({ received: true });
};

export const verifyCheckoutSession = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.user!.id;

    // Retrieve the session from Stripe to confirm payment
    let session: {
      payment_status: string;
      metadata?: Record<string, string> | null;
    };
    try {
      session = await getStripe().checkout.sessions.retrieve(sessionId);
    } catch {
      return next(new AppError("Checkout session not found", 404));
    }

    // Ensure this session belongs to the authenticated user
    if (session.metadata?.userId !== userId) {
      return next(new AppError("Session does not belong to this account", 403));
    }

    if (session.payment_status !== "paid") {
      return next(
        new AppError("Payment has not been completed for this session", 402),
      );
    }

    // Try to fulfill the cart — idempotent.
    // If the webhook already ran, the cart is empty and this returns null.
    // If the webhook hasn't run yet (local dev, slow delivery), we fulfill here.
    const couponCodeMeta = session.metadata?.couponCode ?? undefined;
    let order = null;
    try {
      order = await fulfillCartOrder(userId, sessionId, couponCodeMeta);
    } catch (err) {
      logger.warn(
        "verifyCheckoutSession fulfillment failed — looking for existing order",
        {
          userId,
          sessionId,
          error: err,
        },
      );
    }

    // If fulfillment returned null (cart was already empty), look up by session ID
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
