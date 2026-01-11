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

const REDIS_TTL = 3600; // 1 hour in seconds
const getProductKey = (id: string) => `product:${id}`;
const getProductsQueryKey = (query: any) =>
  `products:list:${JSON.stringify(query)}`;

const clearProductCache = async () => {
  const keys = await redis.keys("products:list:*");
  if (keys.length > 0) await redis.del(keys);
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

    //  Try to fetch from Redis
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info("Serving products from cache");
      return res.status(200).json(JSON.parse(cachedData));
    }

    logger.info("Fetching all Products");
    // Build query components
    const where = buildWhereClause(filters);
    const orderBy = buildOrderByClause(filters);
    const select = buildSelectClause(filters.fields);
    const { skip, take } = getPaginationParams(filters.page, filters.limit);

    // Execute query with count in parallel
    const [products, total] = await Promise.all([
      prisma.products.findMany({
        where,
        orderBy,
        skip,
        take,
        include: !select
          ? {
              category: {
                select: {
                  category_id: true,
                  name: true,
                },
              },
            }
          : undefined,
      }),
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
    // 3. Save to Redis
    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(responseData));

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
      return res.status(200).json({
        status: "Success",
        source: "cached",
        data: { product: JSON.parse(cachedProduct) },
      });
    }

    logger.info(`Fetching Product by ID: ${productId}`);
    const product = await prisma.products.findUnique({
      where: { product_id: productId },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!product) {
      logger.warn(`Prouct with ID: ${productId} not found`);
      return next(new AppError("Product not found", 400));
    }

    //  Store in Cache
    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(product));

    logger.info("Product Fetched by ID successfully");
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
      include: {
        category: {
          select: {
            category_id: true,
            name: true,
          },
        },
      },
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
