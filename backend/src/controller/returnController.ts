import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";
import { createReturnSchema, updateReturnSchema } from "../Schema/returnSchema";
import { logAudit } from "../utils/audit";

const RETURNABLE_WINDOW_DAYS = Number(process.env.RETURNABLE_WINDOW_DAYS ?? 30);

export const createReturn = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const orderId = req.params.orderId;
    const { reason } = createReturnSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { returnRequest: true },
    });

    if (!order || order.userId !== userId) {
      return next(new AppError("Order not found", 404));
    }

    if (order.status !== "DELIVERED") {
      return next(new AppError("Only Delivered orders can be returned", 400));
    }

    if (order.returnRequest) {
      return next(
        new AppError("A return request already exists for this order", 400),
      );
    }

    const deliveredAt = order.updatedAt;
    const deadline = new Date(deliveredAt);
    deadline.setDate(deadline.getDate() + RETURNABLE_WINDOW_DAYS);

    if (new Date() > deadline) {
      return next(
        new AppError(
          `The ${RETURNABLE_WINDOW_DAYS}-day return window for this order has passed`,
          400,
        ),
      );
    }

    const returnRequest = await prisma.returnRequest.create({
      data: { orderId, userId, reason },
    });

    logger.info("Return request created", { orderId, userId });
    res.status(201).json({
      status: "success",
      data: { returnRequest },
    });
  },
);

export const getMyRetrun = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;

    const returns = await prisma.returnRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            id: true,
            total: true,
            createdAt: true,
            items: {
              take: 1,
              include: {
                product: {
                  select: {
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      status: "success",
      results: returns.length,
      data: { returns },
    });
  },
);

/**
 * Admin: manage returns
 */
export const adminGetReturn = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const status = req.query.status as string | undefined;

    const returns = await prisma.returnRequest.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: "desc" },
      include: {
        order: { select: { id: true, total: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    res.status(200).json({
      status: "success",
      results: returns.length,
      data: { returns },
    });
  },
);

export const adminUpdateReturn = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { status, adminNote } = updateReturnSchema.parse(req.body);
    const id = req.params.id;

    const existing = await prisma.returnRequest.findUnique({
      where: { id },
    });

    if (!existing) return next(new AppError("Return request not found", 404));

    const updateReturns = await prisma.returnRequest.update({
      where: { id },
      data: { status, adminNote },
    });

    await logAudit({
      req,
      action: "UPDATE_RETURN_REQUEST",
      entityType: "ReturnRequest",
      entityId: req.params.id,
      before: { status: existing.status },
      after: { status, adminNote },
    });

    logger.info("Retrun request updated", { id, status });
    res.status(200).json({
      status: "success",
      data: {
        requestReturn: updateReturns,
      },
    });
  },
);
