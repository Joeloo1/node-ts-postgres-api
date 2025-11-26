import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
 import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";

const prisma = new PrismaClient();

// CREATE PRODUCT
export const createProduct = catchAsync(async(req: Request, res: Response, next:NextFunction) => {
      const data =  req.body
    if (data.category_id) {
      const categoryExists = await prisma.categories.findUnique({
        where: { category_id: data.category_id },
      });
       if (!categoryExists) {
        return next(new AppError(
          `Category with ID ${data.category_id} does not exist`, 400
        ))
      }
    }
   const product = await prisma.products.create({data,
      include: {
        categories: {
          select: {
            category_id: true,
            name: true,
          },
        },
      },
   })

   res.status(201).json({
    status: 'Success',
    data: { 
      product
    }
   })
})

// GET ALL PRODUCTS
export const getAllProducts = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    const products = await prisma.products.findMany();
    res.status(200).json({
      status: 'Success',
      result: products.length,
      data: {
        products
      }
    })
})

// GET SINGLE PRODUCT
export const getProduct =  catchAsync( async(req: Request, res: Response, next: NextFunction) => {
     const productId = req.params.id;
    const product = await prisma.products.findUnique({
      where: { product_id: productId },
       include: { categories: {
        select: {
          name: true
        }
      } },
    })

    if (!product) {
      return next(new AppError('Product not found', 400))
    }
   
    res.status(200).json({
      status: 'Success',
      data: { product }
    })
})

// UPDATE PRODUCT
export const updateProduct = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  const productId = req.params.id
  const data = req.body; 

  const existingProduct = await prisma.products.findUnique({
    where: { product_id: productId}
  })

  if (!existingProduct) {
    return next( new AppError(`product with ${productId} not found`, 404))
  }

   if (data.category_id) {
      const categoryExists = await prisma.categories.findUnique({
        where: { category_id: data.category_id },
      });
         if (!categoryExists) {
        return next(new AppError(
          `Category with ID ${data.category_id} does not exist`, 400
        ))
      }
    }

    const product = await prisma.products.update({
      where: { product_id: productId},
      data, 
      include: {
        categories: {
          select: {
            category_id: true,
            name: true
          }
        }
      }
    })

    res.status(200).json({
      status: 'Success',
      data:{
        product
      }
    })
})

// delete product
export const deleteProduct = catchAsync(async(req: Request, res: Response, next: NextFunction) => {
  const productId = req.params.id

  const existingProduct = await prisma.products.findUnique({
    where: { product_id: productId}
  })

  if (!existingProduct) {
    return next(new AppError(`Product with ID: ${productId} not found`, 404))
  }
  await prisma.products.delete({
    where: {product_id: productId}
  })

  res.status(200).json({
    status: 'Success',
    data: null
  })
})