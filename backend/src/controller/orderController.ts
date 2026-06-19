import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";

import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { CancelledBy, OrderStatus } from "@prisma/client";
import logger from "../config/logger";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "../Schema/orderSchema";
import { emailQueue } from "../jobs/emailQueue";
import { logAudit } from "../utils/audit";
import { triggerStockNotification } from "./stockNotifyController";
import { awardLoyaltyPoints } from "./loyaltyController";

const ORDER_STATUS_COPY: Partial<
  Record<OrderStatus, { label: string; message: string }>
> = {
  PAID: {
    label: "Payment Confirmed",
    message: "We have received your payment and your order is now confirmed.",
  },
  PROCESSING: {
    label: "Processing",
    message: "Your order is being prepared and will ship soon.",
  },
  SHIPPED: {
    label: "Shipped",
    message:
      "Your order is on its way. You will receive it within the estimated delivery window.",
  },
  DELIVERED: {
    label: "Delivered",
    message: "Your order has been delivered. We hope you enjoy your purchase!",
  },
  CANCELLED: {
    label: "Cancelled",
    message:
      "Your order has been cancelled. If you have questions, please contact support.",
  },
  REFUNDED: {
    label: "Refunded",
    message:
      "Your refund has been processed. Funds will appear in your account within 5-10 business days.",
  },
};

// Decrement stock and auto-set availability=false when stock hits 0
async function decrementStock(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  item: { product_id: string; variantId?: string | null; quantity: number },
) {
  if (item.variantId) {
    const updated = await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { decrement: item.quantity } },
      select: { stock: true },
    });
    if (updated.stock === 0) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { availability: false },
      });
    }
  } else {
    const updated = await tx.products.update({
      where: { product_id: item.product_id },
      data: { stock: { decrement: item.quantity } },
      select: { stock: true },
    });
    if (updated.stock === 0) {
      await tx.products.update({
        where: { product_id: item.product_id },
        data: { availability: false },
      });
    }
  }
}

// Restore stock on cancellation, auto-set availability=true, and return IDs that went from 0 → positive
async function restoreStock(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  item: { product_id: string; variantId?: string | null; quantity: number },
): Promise<string | null> {
  if (item.variantId) {
    const before = await tx.productVariant.findUnique({
      where: { id: item.variantId },
      select: { stock: true },
    });
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity }, availability: true },
    });
    return null; // variant back-in-stock uses product_id, handle separately if needed
  } else {
    const before = await tx.products.findUnique({
      where: { product_id: item.product_id },
      select: { stock: true },
    });
    await tx.products.update({
      where: { product_id: item.product_id },
      data: { stock: { increment: item.quantity }, availability: true },
    });
    return (before?.stock ?? 0) === 0 ? item.product_id : null;
  }
}

export const createOrder = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;
    const { items, couponCode, shippingAddress } = createOrderSchema.parse(
      req.body,
    );

    const order = await prisma.$transaction(async (tx) => {
      const productIds = items.map((item) => item.product_id);
      const products = await tx.products.findMany({
        where: { product_id: { in: productIds }, deletedAt: null },
        include: { variants: true },
      });

      const productMap = new Map(products.map((p) => [p.product_id, p]));
      let calculatedTotal = 0;
      const orderItemsData: {
        product_id: string;
        quantity: number;
        price: number;
        variantId?: string;
        variantName?: string;
      }[] = [];

      for (const item of items) {
        const product = productMap.get(item.product_id);
        if (!product)
          throw new AppError(`Product not found: ${item.product_id}`, 404);

        let variant = null;
        if (item.variantId) {
          variant =
            product.variants.find((v) => v.id === item.variantId) ?? null;
          if (!variant)
            throw new AppError(
              `Variant not found for product: ${product.name}`,
              404,
            );
          if (!variant.availability)
            throw new AppError(`Variant "${variant.name}" is unavailable`, 400);
        }

        const availableStock = variant ? variant.stock : product.stock;
        if (availableStock < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.name}"${variant ? ` (${variant.name})` : ""}. Available: ${availableStock}`,
            400,
          );
        }

        await decrementStock(tx, {
          product_id: item.product_id,
          variantId: item.variantId,
          quantity: item.quantity,
        });

        const discountMultiplier = product.discount
          ? 1 - product.discount / 100
          : 1;
        const basePrice = product.price + (variant?.priceModifier ?? 0);
        const linePrice =
          Math.round(basePrice * discountMultiplier * 100) / 100;

        calculatedTotal += linePrice * item.quantity;
        orderItemsData.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: linePrice,
          ...(variant && { variantId: variant.id, variantName: variant.name }),
        });
      }

      let discountAmount = 0;
      let resolvedCouponCode: string | null = null;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.toUpperCase() },
        });
        if (
          coupon &&
          coupon.active &&
          (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
          (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
          (coupon.minOrderTotal === null ||
            calculatedTotal >= coupon.minOrderTotal)
        ) {
          discountAmount =
            coupon.type === "PERCENTAGE"
              ? (calculatedTotal * coupon.value) / 100
              : Math.min(coupon.value, calculatedTotal);
          resolvedCouponCode = coupon.code;
          await tx.coupon.update({
            where: { code: coupon.code },
            data: { usedCount: { increment: 1 } },
          });
        }
      }

      const finalTotal =
        Math.round(Math.max(0, calculatedTotal - discountAmount) * 100) / 100;

      return tx.order.create({
        data: {
          userId,
          total: finalTotal,
          discountAmount: Math.round(discountAmount * 100) / 100,
          couponCode: resolvedCouponCode,
          shippingName: shippingAddress?.name,
          shippingStreet: shippingAddress?.street,
          shippingCity: shippingAddress?.city,
          shippingState: shippingAddress?.state,
          shippingZip: shippingAddress?.zip,
          shippingCountry: shippingAddress?.country,
          status: "PENDING",
          items: { create: orderItemsData },
        },
        include: { items: true },
      });
    });

    logger.info(`Order ${order.id} created by user ${userId}`, {
      total: order.total,
      discountAmount: order.discountAmount,
      couponCode: order.couponCode,
    });
    res.status(201).json({
      status: "success",
      data: { order },
    });
  },
);

export const checkoutFromCart = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;
    const { couponCode } = req.body as { couponCode?: string };

    const order = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { userId },
        include: { items: { include: { product: true, variant: true } } },
      });

      if (!cart || cart.items.length === 0) {
        throw new AppError("Your cart is empty", 400);
      }

      let calculatedTotal = 0;
      const orderItemsData: {
        product_id: string;
        quantity: number;
        price: number;
        variantId?: string;
        variantName?: string;
      }[] = [];

      for (const item of cart.items) {
        const product = item.product;
        const variant = item.variant;

        const availableStock = variant ? variant.stock : product.stock;
        if (availableStock < item.quantity) {
          throw new AppError(
            `Insufficient stock for "${product.name}"${variant ? ` (${variant.name})` : ""}. Available: ${availableStock}`,
            400,
          );
        }

        await decrementStock(tx, {
          product_id: item.product_id,
          variantId: variant?.id ?? null,
          quantity: item.quantity,
        });

        const discountMultiplier = product.discount
          ? 1 - product.discount / 100
          : 1;
        const basePrice = product.price + (variant?.priceModifier ?? 0);
        const linePrice =
          Math.round(basePrice * discountMultiplier * 100) / 100;

        calculatedTotal += linePrice * item.quantity;
        orderItemsData.push({
          product_id: item.product_id,
          quantity: item.quantity,
          price: linePrice,
          ...(variant && { variantId: variant.id, variantName: variant.name }),
        });
      }

      let discountAmount = 0;
      let resolvedCouponCode: string | null = null;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.toUpperCase() },
        });
        if (
          coupon &&
          coupon.active &&
          (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
          (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
          (coupon.minOrderTotal === null ||
            calculatedTotal >= coupon.minOrderTotal)
        ) {
          discountAmount =
            coupon.type === "PERCENTAGE"
              ? (calculatedTotal * coupon.value) / 100
              : Math.min(coupon.value, calculatedTotal);
          resolvedCouponCode = coupon.code;
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
          discountAmount: Math.round(discountAmount * 100) / 100,
          couponCode: resolvedCouponCode,
          status: "PENDING",
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    logger.info(`Order ${order.id} created from cart by user ${userId}`);
    res.status(201).json({
      status: "success",
      data: { order },
    });
  },
);

export const getMyOrder = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    logger.info(`Fetching orders for user ID: ${userId}`);

    if (cursor) {
      const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        cursor: { id: cursor },
        skip: 1,
        take: limit,
        include: {
          items: {
            include: { product: { select: { name: true, image: true, images: true } } },
          },
        },
      });
      const nextCursor = orders.length === limit ? orders[orders.length - 1].id : null;
      return res.status(200).json({
        status: "success",
        results: orders.length,
        data: { orders },
        pagination: { limit, nextCursor, hasNext: nextCursor !== null },
      });
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          items: {
            include: { product: { select: { name: true, image: true, images: true } } },
          },
        },
      }),
      prisma.order.count({ where: { userId } }),
    ]);

    const nextCursor = orders.length === limit ? orders[orders.length - 1].id : null;
    logger.info("Orders fetched successfully");
    res.status(200).json({
      status: "success",
      results: orders.length,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      data: { orders },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit), nextCursor },
    });
  },
);

export const getOrderById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info(`Fetching order with ID: ${req.params.id}`);
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: { select: { name: true, image: true, images: true } },
          },
        },
      },
    });

    if (!order) {
      logger.warn(`Order with ID: ${req.params.id} not found`);
      return next(new AppError("Order not found", 404));
    }

    if (order.userId !== req.user!.id) {
      logger.warn(
        `User ${req.user!.id} attempted to access order ${order.id} belonging to ${order.userId}`,
      );
      return next(
        new AppError("You do not have permission to view this order", 403),
      );
    }

    logger.info(`Order with ID: ${req.params.id} fetched successfully`);
    res.status(200).json({
      status: "success",
      data: { order },
    });
  },
);

// Public tracking — no auth. Validates email ownership server-side.
export const trackOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { orderId, email } = req.query as { orderId?: string; email?: string };

    if (!orderId || !email) {
      return next(new AppError("orderId and email are required", 400));
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true } },
        items: {
          include: {
            product: { select: { name: true, image: true } },
          },
        },
      },
    });

    if (!order || order.user.email.toLowerCase() !== email.toLowerCase()) {
      // Intentionally vague — don't reveal if order exists
      return next(new AppError("Order not found", 404));
    }

    // Return only safe fields — no pricing, no personal details beyond what user already knows
    res.status(200).json({
      status: "success",
      data: {
        order: {
          id: order.id,
          shortId: order.id.slice(0, 8).toUpperCase(),
          status: order.status,
          createdAt: order.createdAt,
          shippedAt: order.shippedAt,
          trackingNumber: order.trackingNumber,
          shippingCity: order.shippingCity,
          shippingCountry: order.shippingCountry,
          items: order.items.map((item) => ({
            name: item.variantName
              ? `${item.product.name} — ${item.variantName}`
              : item.product.name,
            image: item.product.image,
            quantity: item.quantity,
          })),
        },
      },
    });
  },
);

export const updateOrder = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { status, trackingNumber } = updateOrderStatusSchema.parse(req.body);

    const before = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { status: true, trackingNumber: true },
    });

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(trackingNumber && { trackingNumber }),
        ...(status === OrderStatus.SHIPPED && { shippedAt: new Date() }),
      },
      include: {
        user: { select: { email: true, name: true } },
        items: {
          take: 5,
          include: { product: { select: { name: true } } },
        },
      },
    });

    const copy = ORDER_STATUS_COPY[status as OrderStatus];

    if (copy) {
      await emailQueue
        .add("send-email", {
          email: order.user.email,
          subject: `Your Northline order has been ${copy.label.toLowerCase()}`,
          template: "orderStatus",
          templateData: {
            name: order.user.name,
            orderId: order.id.slice(0, 8).toUpperCase(),
            statusLabel: copy.label,
            statusMessage: copy.message,
            trackingNumber: order.trackingNumber ?? null,
          },
        })
        .catch((err) =>
          logger.warn("Failed to queue order status email", { err }),
        );
    }

    // Award loyalty points and complete referral on first delivery
    if (status === OrderStatus.DELIVERED) {
      const pointsEarned = Math.floor(order.total);
      if (pointsEarned > 0) {
        awardLoyaltyPoints(
          order.userId,
          pointsEarned,
          "EARNED",
          `Order #${order.id.slice(0, 8).toUpperCase()}`,
          order.id,
        ).catch(() => {});
      }

      // Complete referral on referee's first delivered order
      const referral = await prisma.referral
        .findUnique({ where: { refereeId: order.userId } })
        .catch(() => null);
      if (referral && referral.status === "PENDING") {
        await prisma.referral
          .update({
            where: { id: referral.id },
            data: { status: "COMPLETED", completedAt: new Date() },
          })
          .catch(() => {});
        // Bonus: 200 pts to referrer, 100 pts to referee
        awardLoyaltyPoints(referral.referrerId, 200, "BONUS", "Referral reward").catch(() => {});
        awardLoyaltyPoints(order.userId, 100, "BONUS", "Welcome referral bonus").catch(() => {});
      }
    }

    // Schedule review request 7 days after delivery
    if (status === OrderStatus.DELIVERED) {
      const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
      await emailQueue
        .add(
          "send-email",
          {
            email: order.user.email,
            subject: `How was your Northline order?`,
            template: "reviewRequest",
            templateData: {
              name: order.user.name,
              orderId: order.id.slice(0, 8).toUpperCase(),
              ordersUrl: `${process.env.CLIENT_URL}/orders`,
              year: new Date().getFullYear(),
            },
          },
          { delay: SEVEN_DAYS_MS },
        )
        .catch((err) =>
          logger.warn("Failed to schedule review request email", { err }),
        );
    }

    await logAudit({
      req,
      action: "UPDATE_ORDER_STATUS",
      entityType: "Order",
      entityId: order.id,
      before: {
        status: before?.status,
        trackingNumber: before?.trackingNumber,
      },
      after: { status: order.status, trackingNumber: order.trackingNumber },
    });

    logger.info(
      `Order ${order.id} status updated: ${before?.status} → ${order.status}`,
      { trackingNumber: order.trackingNumber },
    );
    res.status(200).json({
      status: "success",
      message: "Order status updated successfully",
      data: { order },
    });
  },
);

export const cancelOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;
    const userId = req.user!.id;

    const cancellableStatus: OrderStatus[] = [OrderStatus.PENDING];

    logger.info(`User with ID: ${userId} wants to cancel order ID: ${orderId}`);
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      logger.warn(`Order with ID: ${orderId} not found`);
      return next(new AppError("Order not found", 404));
    }

    if (order.userId !== userId) {
      return next(
        new AppError("You are not allowed to cancel this Order", 403),
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      return next(new AppError("Order already cancelled", 400));
    }

    if (!cancellableStatus.includes(order.status)) {
      return next(new AppError("Order cannot be cancelled at this stage", 400));
    }

    const restockedProductIds: string[] = [];

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      const orderWithItems = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (orderWithItems) {
        for (const item of orderWithItems.items) {
          const restocked = await restoreStock(tx, {
            product_id: item.product_id,
            variantId: item.variantId,
            quantity: item.quantity,
          });
          if (restocked) restockedProductIds.push(restocked);
        }
      }

      return tx.order.update({
        where: { id: orderId, status: { in: cancellableStatus } },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: CancelledBy.USER,
        },
      });
    });

    // Trigger back-in-stock notifications for products that went from 0 → positive
    for (const productId of restockedProductIds) {
      triggerStockNotification(productId).catch((err) =>
        logger.warn("Back-in-stock notification failed", { productId, err }),
      );
    }

    // Notify user of cancellation
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (user) {
      emailQueue
        .add("send-email", {
          email: user.email,
          subject: "Your Northline order has been cancelled",
          template: "orderStatus",
          templateData: {
            name: user.name,
            orderId: orderId.slice(0, 8).toUpperCase(),
            statusLabel: "Cancelled",
            statusMessage: ORDER_STATUS_COPY[OrderStatus.CANCELLED]!.message,
            trackingNumber: null,
          },
        })
        .catch((err) =>
          logger.warn("Failed to queue cancel confirmation email", { err }),
        );
    }

    await logAudit({
      req,
      action: "USER_CANCEL_ORDER",
      entityType: "Order",
      entityId: orderId,
      before: { status: order.status },
      after: { status: OrderStatus.CANCELLED, cancelledBy: CancelledBy.USER },
    });

    logger.info(`Order with ID: ${orderId} successfully cancelled`);
    res.status(200).json({
      status: "success",
      data: { order: cancelledOrder },
    });
  },
);

export const getAllOrders = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const where = status ? { status: status as OrderStatus } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          items: {
            include: {
              product: { select: { name: true, image: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    logger.info("Admin fetched all orders");
    res.status(200).json({
      status: "success",
      results: orders.length,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      data: { orders },
    });
  },
);

export const adminCancelOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;

    const cancellableStatus: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
    ];

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    if (order.status === OrderStatus.CANCELLED) {
      return next(new AppError("Order already cancelled", 400));
    }

    if (!cancellableStatus.includes(order.status)) {
      return next(new AppError("Order cannot be cancelled at this stage", 400));
    }

    const restockedProductIds: string[] = [];

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      const orderWithItems = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (orderWithItems) {
        for (const item of orderWithItems.items) {
          const restocked = await restoreStock(tx, {
            product_id: item.product_id,
            variantId: item.variantId,
            quantity: item.quantity,
          });
          if (restocked) restockedProductIds.push(restocked);
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELLED,
          cancelledAt: new Date(),
          cancelledBy: CancelledBy.ADMIN,
        },
      });
    });

    // Trigger back-in-stock notifications
    for (const productId of restockedProductIds) {
      triggerStockNotification(productId).catch((err) =>
        logger.warn("Back-in-stock notification failed", { productId, err }),
      );
    }

    // Notify customer of admin cancellation
    emailQueue
      .add("send-email", {
        email: order.user.email,
        subject: "Your Northline order has been cancelled",
        template: "orderStatus",
        templateData: {
          name: order.user.name,
          orderId: orderId.slice(0, 8).toUpperCase(),
          statusLabel: "Cancelled",
          statusMessage: ORDER_STATUS_COPY[OrderStatus.CANCELLED]!.message,
          trackingNumber: null,
        },
      })
      .catch((err) =>
        logger.warn("Failed to queue admin cancel email", { err }),
      );

    res.status(200).json({
      status: "success",
      data: { order: cancelledOrder },
    });
  },
);

// ADMIN: bulk update order status
export const bulkUpdateOrderStatus = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { ids, status } = req.body as { ids: string[]; status: OrderStatus };

    if (!Array.isArray(ids) || ids.length === 0) {
      return next(new AppError("ids must be a non-empty array", 400));
    }
    if (!Object.values(OrderStatus).includes(status)) {
      return next(new AppError(`Invalid status: ${status}`, 400));
    }

    const { count } = await prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });

    logger.info("Bulk order status update", { ids, status, count });
    res.status(200).json({ status: "success", data: { updated: count } });
  },
);
