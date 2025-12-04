import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "./../config/database"


// GET ALL CATEGORIES 
export const getAllCategories = catchAsync(async (
    req: Request, res: Response, next: NextFunction) => {
    const categories = await prisma.category.findMany();

    res.status(200).json({
        status: 'Success',
        result: categories.length,
        data: {
            categories
        }
    })
})

// GET CATEGORY BY ID
export const getCategoryById = catchAsync(async (
    req: Request, res: Response, next: NextFunction) => {
        const categoryId = parseInt(req.params.id);
        const category = await prisma.category.findUnique({
            where: { category_id: categoryId}
        })
        if (!category) {
            return next(new AppError(
                `Category with ID: ${categoryId} not found`, 404
            ));
        }
          res.status(200).json({
                status: 'Success',
                data: {
                    category
                }
            })
})

// CREATE CATEGORY 
export const createCategory = catchAsync(async (
    req: Request, res: Response, next: NextFunction) => {
        const data = req.body;
        const category = await prisma.category.create({ data })

        res.status(200).json({
            status: 'Success', 
            data: {
                category
            }
        })
});

// DELETE CATEGORY
export const deleteCategory = catchAsync(async(
    req: Request, res: Response, next: NextFunction) => {
        const categoryId = parseInt(req.params.id)

        const existingCategory = await prisma.category.findUnique({
            where: { category_id: categoryId }
        })

        if (!existingCategory) {
            return next(new AppError(`Category with ID: ${categoryId} not found`, 404))
        }
        
        await prisma.category.delete({
            where: { category_id: categoryId }
        })

        res.status(200).json({
            status: 'Success', 
           data: null
        })
    })