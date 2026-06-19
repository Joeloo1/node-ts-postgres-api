import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";
import {
  createAttributeSchema,
  bulkSetAttributesSchema,
} from "../Schema/attributeSchema";
import { scanDel } from "../config/redis";

// PUBLIC: get all attributes for a product
export const getProductAttributes = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;

    const product = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
      select: { product_id: true },
    });
    if (!product) return next(new AppError("Product not found", 404));

    const attributes = await prisma.productAttribute.findMany({
      where: { product_id: productId },
      orderBy: [{ key: "asc" }, { value: "asc" }],
      select: { id: true, key: true, value: true, createdAt: true },
    });

    res.status(200).json({ status: "success", data: { attributes } });
  },
);

// ADMIN: add a single attribute to a product
export const createAttribute = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const { key, value } = createAttributeSchema.parse(req.body);

    const product = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
    });
    if (!product) return next(new AppError("Product not found", 404));

    const attribute = await prisma.productAttribute.create({
      data: { product_id: productId, key, value },
    });

    await redis.del(`product:${productId}`);

    logger.info("Product attribute added", { productId, key, value });
    res.status(201).json({ status: "success", data: { attribute } });
  },
);

// ADMIN: replace all attributes for a product at once
export const bulkSetAttributes = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const { attributes } = bulkSetAttributesSchema.parse(req.body);

    const product = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
    });
    if (!product) return next(new AppError("Product not found", 404));

    await prisma.$transaction([
      prisma.productAttribute.deleteMany({ where: { product_id: productId } }),
      prisma.productAttribute.createMany({
        data: attributes.map(({ key, value }) => ({
          product_id: productId,
          key,
          value,
        })),
      }),
    ]);

    await redis.del(`product:${productId}`);
    await scanDel("products:list:*");

    logger.info("Product attributes replaced", {
      productId,
      count: attributes.length,
    });
    res.status(200).json({
      status: "success",
      message: `${attributes.length} attribute(s) set for product ${productId}`,
    });
  },
);

// ADMIN: delete a single attribute by its own ID
export const deleteAttribute = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { attributeId } = req.params;

    const attr = await prisma.productAttribute.findUnique({
      where: { id: attributeId },
    });
    if (!attr) return next(new AppError("Attribute not found", 404));

    await prisma.productAttribute.delete({ where: { id: attributeId } });
    await redis.del(`product:${attr.product_id}`);
    await scanDel("products:list:*");

    res.status(204).send();
  },
);
