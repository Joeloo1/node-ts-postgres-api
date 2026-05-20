import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { productQuerySchema } from "../Schema/querySchema";
import {
  buildWhereClause,
  buildOrderByClause,
  buildSelectClause,
  getPaginationParams,
} from "../utils/queryBuilder";
import logger from "../config/logger";

const REDIS_TTL = 3600;
const getProductKey = (id: string) => `product:${id}`;

// Sort keys so query param order never produces a different cache key
const getProductsQueryKey = (query: Record<string, unknown>) => {
  const sorted = Object.keys(query)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => { acc[k] = query[k]; return acc; }, {});
  return `products:list:${JSON.stringify(sorted)}`;
};

const productCategoryInclude = {
  category: {
    select: {
      category_id: true,
      name: true,
    },
  },
} as const;

const baseListSelect = (includeImages: boolean) =>
  ({
    product_id: true,
    name: true,
    description: true,
    price: true,
    unit: true,
    image: true,
    discount: true,
    availability: true,
    brand: true,
    rating: true,
    category_id: true,
    createdAt: true,
    updatedAt: true,
    ...(includeImages ? ({ images: true } as any) : {}),
    category: productCategoryInclude.category,
  }) as any;

const clearProductCache = async () => {
  const keys = await redis.keys("products:list:*");
  if (keys.length > 0) await Promise.all(keys.map((k) => redis.del(k)));
};

// CREATE PRODUCT
export const createProduct = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const data = req.body;

    if (data.category_id) {
      const categoryExists = await prisma.category.findUnique({
        where: { category_id: data.category_id },
      });
      if (!categoryExists) {
        logger.warn(`Category with ID: ${data.category_id} does not exist`);
        return next(
          new AppError(
            `Category with ID ${data.category_id} does not exist`,
            400,
          ),
        );
      }
    }

    logger.info("Creating new Product");
    const product = await prisma.products.create({
      data,
      include: {
        category: {
          select: {
            category_id: true,
            name: true,
          },
        },
      },
    });

    await clearProductCache();

    logger.info("Product created successfully");
    res.status(201).json({
      status: "Success",
      data: {
        product,
      },
    });
  },
);

// GET ALL PRODUCTS WITH FILTERING, SORTING & PAGINATION
export const getAllProducts = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    // Validate and parse query parameters
    const filters = productQuerySchema.parse(req.query);

    const cacheKey = getProductsQueryKey(req.query);

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info("Serving products from cache");
      res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=600");
      return res.status(200).json(JSON.parse(cachedData));
    }

    logger.info("Fetching all Products");
    // Build query components
    const where = buildWhereClause(filters);
    const orderBy = buildOrderByClause(filters);
    const select = buildSelectClause(filters.fields, {
      includeImages: filters.includeImages,
    });
    const { skip, take } = getPaginationParams(filters.page, filters.limit);

    // Execute query with count in parallel
    const productsPromise = select
      ? prisma.products.findMany({
          where,
          orderBy,
          skip,
          take,
          select,
        })
      : prisma.products.findMany({
          where,
          orderBy,
          skip,
          take,
          select: baseListSelect(filters.includeImages),
        });

    const [products, total] = await Promise.all([
      productsPromise,
      prisma.products.count({ where }),
    ]);

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / filters.limit);

    logger.info("Fetched all products successfully");

    const responseData = {
      status: "Success",
      results: products.length,
      data: {
        products,
      },
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
        hasNext: filters.page < totalPages,
        hasPrev: filters.page > 1,
      },
    };
    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(responseData));

    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=600");
    res.status(200).json(responseData);
  },
);

// GET SINGLE PRODUCT
export const getProduct = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;

    const cacheKey = getProductKey(productId);

    //  Check Cache
    const cachedProduct = await redis.get(cacheKey);
    if (cachedProduct) {
      logger.info(`Serving product ${productId} from cache`);
      const parsed = JSON.parse(cachedProduct) as any;
      // If cache was populated before `images` existed, refresh it.
      if (!Array.isArray(parsed?.images)) {
        logger.info(
          `Cache for product ${productId} is stale (missing images). Refreshing...`,
        );
        await redis.del(cacheKey);
      } else {
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
        return res.status(200).json({
          status: "Success",
          source: "cached",
          data: { product: parsed },
        });
      }
    }

    logger.info(`Fetching Product by ID: ${productId}`);
    const product = await prisma.products.findUnique({
      where: { product_id: productId },
      include: productCategoryInclude,
    });

    if (!product) {
      logger.warn(`Prouct with ID: ${productId} not found`);
      return next(new AppError("Product not found", 400));
    }

    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(product));

    logger.info("Product Fetched by ID successfully");
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
    res.status(200).json({
      status: "Success",
      data: { product },
    });
  },
);

// UPDATE PRODUCT
export const updateProduct = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const data = req.body;

    const existingProduct = await prisma.products.findUnique({
      where: { product_id: productId },
    });

    if (!existingProduct) {
      logger.warn(`Product with ${productId} not found`);
      return next(new AppError(`product with ${productId} not found`, 404));
    }

    if (data.category_id) {
      const categoryExists = await prisma.category.findUnique({
        where: { category_id: data.category_id },
      });
      if (!categoryExists) {
        logger.warn(`Category with ID: ${data.category_id} oes not exist`);
        return next(
          new AppError(
            `Category with ID ${data.category_id} does not exist`,
            400,
          ),
        );
      }
    }

    logger.info("Updating product");
    const product = await prisma.products.update({
      where: { product_id: productId },
      data,
      include: productCategoryInclude,
    });

    await redis.del(getProductKey(productId));
    await clearProductCache();

    logger.info(`Product with ID: ${productId} updated successfully`);
    res.status(200).json({
      status: "Success",
      data: {
        product,
      },
    });
  },
);

// delete product
export const deleteProduct = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;

    const existingProduct = await prisma.products.findUnique({
      where: { product_id: productId },
    });

    if (!existingProduct) {
      logger.warn(`Product with ID: ${productId} not found`);
      return next(new AppError(`Product with ID: ${productId} not found`, 404));
    }

    logger.info(`Deleting product with ID: ${productId}`);
    await prisma.products.delete({
      where: { product_id: productId },
    });

    await redis.del(getProductKey(productId));
    await clearProductCache();

    logger.info(`Product with ID: ${productId} deleted successfully`);
    res.status(200).json({
      status: "Success",
      data: null,
    });
  },
);

export const addProductImages = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const productId = req.params.id;
    const uploaded = ((req as any).uploadedProductImages ?? []) as string[];

    if (!uploaded.length) {
      return next(
        new AppError("Please upload one or more images (field: images)", 400),
      );
    }

    const product = await prisma.products.findUnique({
      where: { product_id: productId },
    });

    if (!product) {
      return next(new AppError("Product not found", 404));
    }

    const mode = typeof req.query.mode === "string" ? req.query.mode : "append";
    const existingImages = Array.isArray((product as any).images)
      ? ((product as any).images as string[])
      : [];
    const nextImages =
      mode === "replace" ? uploaded : [...existingImages, ...uploaded];

    const updated = await prisma.products.update({
      where: { product_id: productId },
      data: {
        ...({ images: nextImages } as any),
        image: product.image ?? nextImages[0] ?? null,
      } as any,
      include: productCategoryInclude,
    });

    await redis.del(getProductKey(productId));
    await clearProductCache();

    res.status(200).json({
      status: "success",
      data: {
        product: updated,
      },
    });
  },
);
