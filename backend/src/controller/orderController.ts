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
};

export const createOrder = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;
    const { items, couponCode } = createOrderSchema.parse(req.body);

    const order = await prisma.$transaction(async (tx) => {
      const productIds = items.map((item) => item.product_id);
      const products = await tx.products.findMany({
        where: { product_id: { in: productIds } },
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

        // Resolve variant if provided
        let variant = null;
        if (item.variantId) {
          variant = product.variants.find((v) => v.id === item.variantId) ?? null;
          if (!variant)
            throw new AppError(`Variant not found for product: ${product.name}`, 404);
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

        // Apply product-level discount + variant price modifier
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

      // Apply coupon discount inside the transaction so it's atomic
      let discountAmount = 0;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.toUpperCase() },
        });
        if (
          coupon &&
          coupon.active &&
          (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
          (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
          (coupon.minOrderTotal === null || calculatedTotal >= coupon.minOrderTotal)
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

      return tx.order.create({
        data: {
          userId,
          total: finalTotal,
          status: "PENDING",
          items: { create: orderItemsData },
        },
        include: { items: true },
      });
    });

    logger.info(`Order ${order.id} created by user ${userId}`);
    res.status(201).json({
      status: "success",
      data: { order },
    });
  },
);

// Checkout from cart
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

        // Apply product-level discount + variant price modifier
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

      // Apply coupon discount inside the transaction so it's atomic
      let discountAmount = 0;
      if (couponCode) {
        const coupon = await tx.coupon.findUnique({
          where: { code: couponCode.toUpperCase() },
        });
        if (
          coupon &&
          coupon.active &&
          (!coupon.expiresAt || coupon.expiresAt > new Date()) &&
          (coupon.maxUses === null || coupon.usedCount < coupon.maxUses) &&
          (coupon.minOrderTotal === null || calculatedTotal >= coupon.minOrderTotal)
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
          status: "PENDING",
          items: { create: orderItemsData },
        },
        include: { items: true },
      });

      // Clear the cart after successful order creation
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

//  Get My Order
export const getMyOrder = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    logger.info(`Fetching orders for user ID: ${req.user!.id}`);
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: {
          include: {
            product: { select: { name: true, image: true, images: true } },
          },
        },
      },
    });

    logger.info("Orders fetched successfully");
    res.status(200).json({
      status: "success",
      results: orders.length,
      data: {
        orders,
      },
    });
  },
);

// Get single Order
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
      data: {
        order,
      },
    });
  },
);

// update Order (only Admin)
export const updateOrder = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { status } = updateOrderStatusSchema.parse(req.body);

    const before = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { status: true },
    });

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    const copy = ORDER_STATUS_COPY[status as OrderStatus];

    if (copy) {
      await emailQueue.add("send-email", {
        email: order.user.email,
        subject: `Your Northline order has been ${copy.label.toLowerCase()}`,
        template: "orderStatus",
        templateData: {
          name: order.user.name,
          orderId: order.id.slice(0, 8).toUpperCase(),
          statusLabel: copy.label,
          statusMessage: copy.message,
        },
      });
    }

    await logAudit({
      req,
      action: "UPDATE_ORDER_STATUS",
      entityType: "Order",
      entityId: order.id,
      before: { status: before?.status },
      after: { status: order.status },
    });

    logger.info(
      `Order ${order.id} status updated: ${before?.status} → ${order.status}`,
    );
    res.status(200).json({
      status: "success",
      message: "Order status updated successfully",
      data: { order },
    });
  },
);

// Cancel Order (USER)
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
      logger.warn(
        `User with ID: ${userId} is not authorized to cancel order ID: ${orderId}`,
      );
      return next(
        new AppError("You are not allowed to cancel this Order", 403),
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      logger.warn(`Order with ID: ${orderId} id already cancelled`);
      return next(new AppError("Order already cancelled", 400));
    }

    if (!cancellableStatus.includes(order.status)) {
      logger.warn(
        `Order with ID : ${orderId} cannot be canceled at this stage`,
      );
      return next(new AppError("Order cannot be cancelled at this stage", 400));
    }

    logger.info(`Cancelling order with ID: ${orderId}`);
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      const orderWithItems = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (orderWithItems) {
        for (const item of orderWithItems.items) {
          await tx.products.update({
            where: { product_id: item.product_id },
            data: { stock: { increment: item.quantity } },
          });
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

    await logAudit({
      req,
      action: "USER_CANCEL_ORDER",
      entityType: "Order",
      entityId: orderId,
      before: { status: order.status },
      after: { status: OrderStatus.CANCELLED, cancelledBy: CancelledBy.USER },
    });

    logger.info(`Order with ID: ${orderId} sucessfully cancelled`);
    res.status(200).json({
      status: "success",
      data: {
        order: cancelledOrder,
      },
    });
  },
);

// Get All Orders (ADMIN)
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

// Cancel Order (ADMIN)
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

    const cancelledOrder = await prisma.$transaction(async (tx) => {
      const orderWithItems = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (orderWithItems) {
        for (const item of orderWithItems.items) {
          await tx.products.update({
            where: { product_id: item.product_id },
            data: { stock: { increment: item.quantity } },
          });
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

    res.status(200).json({
      status: "success",
      data: {
        order: cancelledOrder,
      },
    });
  },
);
