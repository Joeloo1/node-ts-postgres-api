import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
 import { CreateProductInput } from "./../Schema/productSchema";
import AppError from "../utils/AppError";

const prisma = new PrismaClient();

// GET ALL PRODUCTS
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.products.findMany();
    res.status(200).json({
      status: 'Success',
      result: products.length,
      data: {
        products
      }
    })
  } catch (err) {
    next(err);
  }
};

// CREATE PRODUCT
export const createProduct = async(req: Request, res: Response, next:NextFunction) => {
 try { 
  const data =  req.body

    if (data.category_id) {
      const categoryExists = await prisma.categories.findUnique({
        where: { category_id: data.category_id },
      });
       if (!categoryExists) {
        throw new AppError(
          `Category with ID ${data.category_id} does not exist`, 400
        );
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

   res.status(200).json({
    status: 'Success',
    data: { 
      product
    }
   })
 }catch (err) { 
  next(err)
 }
}

// GET
export const getProduct = async(req: Request, res: Response, next: NextFunction) => {
  try {
     const productId = req.params.id;
    const product = await prisma.products.findUnique({
      where: { product_id: productId },
       include: { categories: {
        select: {
          category_id: true,
          name: true
        }
      } },
    })

    if (!product) {
      return res.status(404).json({ status: 'Not Found', message: 'Product not found' })
    }

    res.status(200).json({
      status: 'Success',
      data: { product }
    })
  } catch (err) {
    next(err)
  }
}

