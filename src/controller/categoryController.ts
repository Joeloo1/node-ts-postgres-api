import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "./../config/database";
import logger from "../config/logger";
import { client as redis } from "../config/redis";

const REDIS_TTL = 3600;
const getCategoryKey = (id: number) => `category:${id}`;
const getCategoryQueryKey = (query: any) =>
  `categories:list:${JSON.stringify(query)}`;

const clearProductCache = async () => {
  const keys = await redis.keys("categorys:list:*");
  if (keys.length > 0) await redis.del(keys);
};

// GET ALL CATEGORIES
export const getAllCategories = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = getCategoryQueryKey(req.query);

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info("Serving category from cache");
      return res.status(200).json(JSON.parse(cachedData));
    }

    const categories = await prisma.category.findMany();

    logger.info("Fetched all categories", {
      totalCategoties: categories.length,
    });
    const responseData = {
      status: "Success",
      result: categories.length,
      data: {
        categories,
      },
    };

    //  Save to Redis
    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(responseData));

    res.status(200).json(responseData);
  },
);

// GET CATEGORY BY ID
export const getCategoryById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const categoryId = parseInt(req.params.id);

    const cacheKey = getCategoryKey(categoryId);

    // check cache
    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info(`Serving category ${categoryId} from cache`);
      return res.status(200).json({
        status: "Success",
        source: "cached",
        data: { category: JSON.parse(cachedData) },
      });
    }
    const category = await prisma.category.findUnique({
      where: { category_id: categoryId },
    });
    if (!category) {
      logger.warn("Category not found", { categoryId });
      return next(
        new AppError(`Category with ID: ${categoryId} not found`, 404),
      );
    }

    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(category));

    logger.info("Fetched category by ID", { categoryId });
    res.status(200).json({
      status: "Success",
      data: {
        category,
      },
    });
  },
);

// CREATE CATEGORY
export const createCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const data = req.body;
    logger.info("Creating a new category", { data });
    const category = await prisma.category.create({ data });

    logger.info("Category created successfully", {
      categoryId: category.category_id,
    });

    await clearProductCache();

    res.status(200).json({
      status: "Success",
      data: {
        category,
      },
    });
  },
);

// DELETE CATEGORY
export const deleteCategory = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const categoryId = parseInt(req.params.id);

    logger.info("Deleting category", { categoryId });
    const existingCategory = await prisma.category.findUnique({
      where: { category_id: categoryId },
    });

    if (!existingCategory) {
      logger.warn("Category to delete not found", { categoryId });
      return next(
        new AppError(`Category with ID: ${categoryId} not found`, 404),
      );
    }

    await prisma.category.delete({
      where: { category_id: categoryId },
    });

    await redis.del(getCategoryKey(categoryId));
    await clearProductCache();

    logger.info("Category deleted sucessfully", { categoryId });
    res.status(200).json({
      status: "Success",
      data: null,
    });
  },
);
