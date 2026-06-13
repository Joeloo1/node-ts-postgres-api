import { Request, Response, NextFunction } from "express";

import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";
import {
  validateCouponSchema,
  createCouponSchema,
  updateCouponSchema,
} from "../Schema/couponSchema";

export const validateCoupon = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { code, orderTotal } = validateCouponSchema.parse(req.body);

    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.active) {
      return next(new AppError("Invalid or expired coupon code", 400));
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return next(new AppError("This coupon has expired", 400));
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return next(new AppError("This coupon has reached its usage limit", 400));
    }

    if (coupon.minOrderTotal !== null && orderTotal < coupon.minOrderTotal) {
      return next(
        new AppError(
          `This coupon requires a minimum order of $${coupon.minOrderTotal.toFixed(2)}`,
          400,
        ),
      );
    }

    const discount =
      coupon.type === "PERCENTAGE"
        ? (orderTotal * coupon.value) / 100
        : Math.min(coupon.value, orderTotal);

    logger.info("Coupon validated", { code, userId: req.user!.id });

    const response = {
      status: "success",
      data: {
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          discount: Math.round(discount * 100) / 100,
          newTotal: Math.round((orderTotal - discount) * 100) / 100,
        },
      },
    };
    res.status(200).json(response);
  },
);

export const applyCoupon = async (code: string): Promise<void> => {
  await prisma.coupon.update({
    where: { code },
    data: { usedCount: { increment: 1 } },
  });
};

export const adminGetCoupon = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const coupon = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({
      status: "success",
      data: { coupon },
    });
  },
);

export const adminCreateCoupon = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const data = createCouponSchema.parse(req.body);

    const coupon = await prisma.coupon.create({
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    logger.info("Coupon created", { code: coupon.code, adminId: req.user!.id });
    res.status(201).json({
      status: "success",
      data: { coupon },
    });
  },
);

export const adminUpdateCoupon = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;
    const data = updateCouponSchema.parse(req.body);

    const existing = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!existing) return next(new AppError("Coupon not found", 404));

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      },
    });

    logger.info("Coupon updated", { id: coupon.id, adminId: req.user!.id });
    res.status(200).json({
      status: "success",
      data: { coupon },
    });
  },
);

export const adminDeleteCoupon = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const id = req.params.id;

    const existing = await prisma.coupon.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Coupon not found", 404));

    await prisma.coupon.delete({ where: { id } });

    logger.info("Coupon deleted", { id, adminId: req.user!.id });
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
