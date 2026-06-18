import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";
import {
  createTagSchema,
  updateTagSchema,
  addTagsToProductSchema,
} from "../Schema/tagSchema";
import { scanDel } from "../config/redis";

const TAGS_CACHE_KEY = "tags:all";

const clearTagCache = async () => {
  await redis.del(TAGS_CACHE_KEY);
};

// PUBLIC: list all tags (used by frontend for collection pages)
export const getAllTags = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const cached = await redis.get(TAGS_CACHE_KEY);
    if (cached) {
      return res.status(200).json({ status: "success", data: { tags: JSON.parse(cached) } });
    }

    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { products: true } },
      },
    });

    await redis.setEx(TAGS_CACHE_KEY, 600, JSON.stringify(tags));
    res.status(200).json({ status: "success", data: { tags } });
  },
);

// ADMIN: create tag
export const createTag = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, slug } = createTagSchema.parse(req.body);

    const existing = await prisma.tag.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (existing) {
      return next(new AppError("A tag with this name or slug already exists", 409));
    }

    const tag = await prisma.tag.create({ data: { name, slug } });
    await clearTagCache();

    logger.info("Tag created", { tagId: tag.id, name, slug });
    res.status(201).json({ status: "success", data: { tag } });
  },
);

// ADMIN: update tag
export const updateTag = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const data = updateTagSchema.parse(req.body);

    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Tag not found", 404));

    const tag = await prisma.tag.update({ where: { id }, data });
    await clearTagCache();

    res.status(200).json({ status: "success", data: { tag } });
  },
);

// ADMIN: delete tag (cascades to ProductTag)
export const deleteTag = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    const existing = await prisma.tag.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Tag not found", 404));

    await prisma.tag.delete({ where: { id } });
    await clearTagCache();

    logger.info("Tag deleted", { tagId: id });
    res.status(204).send();
  },
);

// ADMIN: assign tags to a product (replaces existing tags)
export const setProductTags = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const { tagIds } = addTagsToProductSchema.parse(req.body);

    const product = await prisma.products.findFirst({
      where: { product_id: productId, deletedAt: null },
    });
    if (!product) return next(new AppError("Product not found", 404));

    // Verify all tagIds exist
    const tags = await prisma.tag.findMany({ where: { id: { in: tagIds } } });
    if (tags.length !== tagIds.length) {
      return next(new AppError("One or more tag IDs are invalid", 400));
    }

    // Replace all product tags atomically
    await prisma.$transaction([
      prisma.productTag.deleteMany({ where: { productId } }),
      prisma.productTag.createMany({
        data: tagIds.map((tagId) => ({ productId, tagId })),
        skipDuplicates: true,
      }),
    ]);

    await redis.del(`product:${productId}`);
    await scanDel("products:list:*");

    logger.info("Product tags updated", { productId, tagIds });
    res.status(200).json({
      status: "success",
      message: `Tags updated for product ${productId}`,
    });
  },
);

// ADMIN: remove a single tag from a product
export const removeTagFromProduct = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: productId, tagId } = req.params;

    const link = await prisma.productTag.findUnique({
      where: { productId_tagId: { productId, tagId } },
    });
    if (!link) return next(new AppError("Tag not assigned to this product", 404));

    await prisma.productTag.delete({
      where: { productId_tagId: { productId, tagId } },
    });

    await redis.del(`product:${productId}`);
    await scanDel("products:list:*");

    res.status(204).send();
  },
);
