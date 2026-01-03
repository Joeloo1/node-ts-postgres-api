import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "./../config/database";
import logger from "../config/logger";

// GET ALL CATEGORIES
export const getAllCategories = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const categories = await prisma.category.findMany();

    logger.info("Fetched all categories", {
      totalCategoties: categories.length,
    });
    res.status(200).json({
      status: "Success",
      result: categories.length,
      data: {
        categories,
      },
    });
  },
);

// GET CATEGORY BY ID
export const getCategoryById = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const categoryId = parseInt(req.params.id);
    const category = await prisma.category.findUnique({
      where: { category_id: categoryId },
    });
    if (!category) {
      logger.warn("Category not found", { categoryId });
      return next(
        new AppError(`Category with ID: ${categoryId} not found`, 404),
      );
    }

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

    logger.info("Category deleted sucessfully", { categoryId });
    res.status(200).json({
      status: "Success",
      data: null,
    });
  },
);
