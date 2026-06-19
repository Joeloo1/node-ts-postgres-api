import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";
import {
  createPromotionSchema,
  updatePromotionSchema,
} from "../Schema/promotionSchema";
import { schedulePromotion } from "../jobs/promotionQueue";

// PUBLIC: get currently active promotions (used by checkout to apply discounts)
export const getActivePromotions = catchAsync(
  async (_req: Request, res: Response) => {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: { active: true, startsAt: { lte: now }, endsAt: { gte: now } },
      include: { category: { select: { category_id: true, name: true } } },
    });
    res.status(200).json({ status: "success", data: { promotions } });
  },
);

// ADMIN: list all promotions
export const getAllPromotions = catchAsync(
  async (_req: Request, res: Response) => {
    const promotions = await prisma.promotion.findMany({
      orderBy: { startsAt: "desc" },
      include: { category: { select: { category_id: true, name: true } } },
    });
    res.status(200).json({ status: "success", data: { promotions } });
  },
);

// ADMIN: create promotion
export const createPromotion = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const data = createPromotionSchema.parse(req.body);
    const startsAt = new Date(data.startsAt);
    const endsAt = new Date(data.endsAt);

    if (endsAt <= startsAt) {
      return next(new AppError("endsAt must be after startsAt", 400));
    }

    if (data.type === "PERCENTAGE_OFF_CATEGORY" && !data.categoryId) {
      return next(
        new AppError("categoryId is required for PERCENTAGE_OFF_CATEGORY promotions", 400),
      );
    }

    const promotion = await prisma.promotion.create({
      data: { ...data, startsAt, endsAt },
    });

    await schedulePromotion(promotion.id, startsAt, endsAt);

    logger.info("Promotion created", { promotionId: promotion.id, name: data.name });
    res.status(201).json({ status: "success", data: { promotion } });
  },
);

// ADMIN: update promotion
export const updatePromotion = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const data = updatePromotionSchema.parse(req.body);

    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Promotion not found", 404));

    const startsAt = data.startsAt ? new Date(data.startsAt) : existing.startsAt;
    const endsAt = data.endsAt ? new Date(data.endsAt) : existing.endsAt;

    if (endsAt <= startsAt) {
      return next(new AppError("endsAt must be after startsAt", 400));
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: { ...data, startsAt, endsAt },
    });

    await schedulePromotion(promotion.id, startsAt, endsAt);

    res.status(200).json({ status: "success", data: { promotion } });
  },
);

// ADMIN: delete promotion
export const deletePromotion = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const existing = await prisma.promotion.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Promotion not found", 404));

    await prisma.promotion.delete({ where: { id } });
    logger.info("Promotion deleted", { promotionId: id });
    res.status(204).send();
  },
);

// ADMIN: manually toggle active state
export const togglePromotion = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { active } = req.body as { active: boolean };

    if (typeof active !== "boolean") {
      return next(new AppError("active (boolean) is required", 400));
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: { active },
    });

    res.status(200).json({ status: "success", data: { promotion } });
  },
);
