import { Request, Response, NextFunction } from "express";
import { prisma } from "./../config/database";

import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { CancelledBy, OrderStatus } from "@prisma/client";

export const createOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return next(new AppError("Items is required and cannot be empty", 400));
    }

    // calculating total from DB produt price
    let calculatedTotal = 0;

    const orderItemsData: any[] = [];

    for (const item of items) {
      const product = await prisma.products.findUnique({
        where: { product_id: item.product_id },
      });

      if (!product) {
        return next(new AppError(`Product not found: ${item.product_id}`, 404));
      }

      if (item.quantity <= 0) {
        return next(new AppError("Quantity must be greater than o", 400));
      }

      const itemTotal = product.price * item.quantity;
      calculatedTotal += itemTotal;

      orderItemsData.push({
        product_id: item.product_id,
        quantity: item.quantity,
        price: product.price,
      });
    }

    // Transaction to store order + order items
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId,
          total: calculatedTotal,
          status: "PENDING",
        },
      });

      const orderItems = await Promise.all(
        orderItemsData.map((item) =>
          tx.orderItem.create({
            data: {
              orderId: newOrder.id,
              product_id: item.product_id,
              quantity: item.quantity,
              price: item.price,
            },
          })
        )
      );

      return {
        ...newOrder,
        items: orderItems,
      };
    });

    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      data: { order },
    });
  }
);

//  Get My Order
export const getMyOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.user!.id },
      include: { items: true },
    });

    res.status(200).json({
      status: "success",
      results: orders.length,
      data: {
        orders,
      },
    });
  }
);

// Get single Order
export const getOrderById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        user: true,
      },
    });

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    res.status(200).json({
      status: "success",
      data: {
        order,
      },
    });
  }
);

// update Order (only Admin)
export const updateOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status } = req.body;

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });

    res.status(200).json({
      status: "success",
      message: "Order status updated successfully",
      data: { order },
    });
  }
);

// Cancel Order (USER)
export const cancelOrder = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const orderId = req.params.id;
    const userId = req.user!.id;

    const cancellableStatus: OrderStatus[] = [OrderStatus.PENDING];

    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return next(new AppError("Order not found", 404));
    }

    if (order.userId !== userId) {
      return next(
        new AppError("You are not allowed to cancel this Order", 403)
      );
    }

    if (order.status === OrderStatus.CANCELLED) {
      return next(new AppError("Order already cancelled", 400));
    }

    if (!cancellableStatus.includes(order.status)) {
      return next(new AppError("Order cannot be cancelled at this stage", 400));
    }

    const cancelledOrder = await prisma.order.update({
      where: {
        id: orderId,
        status: { in: cancellableStatus },
      },
      data: {
        status: OrderStatus.CANCELLED,
        cancelledAt: new Date(),
        cancelledBy: CancelledBy.USER
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        order: cancelledOrder
      }
    })
  }
);
