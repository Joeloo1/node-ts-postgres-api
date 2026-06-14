import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import {
  createVariantSchema,
  updateVariantSchema,
} from "../Schema/variantSchema";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { client as redis } from "../config/redis";

const REDIS_TTL = 3600;
const variantsCacheKey = (productId: string) => `variants:${productId}`;

export const getProductVariants = catchAsync(
  async (req: Request, res: Response) => {
    const { id: productId } = req.params;

    const cached = await redis.get(variantsCacheKey(productId));
    if (cached) {
      return res.status(200).json({ ...JSON.parse(cached), source: "cached" });
    }

    const variants = await prisma.productVariant.findMany({
      where: { product_id: productId },
      orderBy: { name: "asc" },
    });

    const responseData = { status: "success", data: { variants } };
    await redis.setEx(
      variantsCacheKey(productId),
      REDIS_TTL,
      JSON.stringify(responseData),
    );

    res.status(200).json(responseData);
  },
);

export const createVariant = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: productId } = req.params;
    const data = createVariantSchema.parse(req.body);

    const product = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
    });

    if (!product) return next(new AppError("Product not found", 404));

    logger.info(`Creating variant for product ${productId}`);

    const variant = await prisma.productVariant.create({
      data: { product_id: productId, ...data },
    });

    await redis.del(variantsCacheKey(productId));
    res.status(201).json({ status: "success", data: { variant } });
  },
);

export const updateVariant = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const data = updateVariantSchema.parse(req.body);

    const existing = await prisma.productVariant.findUnique({ where: { id } });

    if (!existing) return next(new AppError("Variant not found", 404));

    const variant = await prisma.productVariant.update({ where: { id }, data });

    await redis.del(variantsCacheKey(existing.product_id));
    res.status(200).json({ status: "success", data: { variant } });
  },
);

export const deleteVariant = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const existing = await prisma.productVariant.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Variant not found", 404));

    await prisma.productVariant.delete({ where: { id } });
    await redis.del(variantsCacheKey(existing.product_id));

    res.status(204).json({ status: "success", data: null });
  },
);
