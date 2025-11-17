import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";
import { CreateProductInput } from "../Schema/productSchema";

const prisma = new PrismaClient();

// GET ALL PRODUCTS
export const getAllProducts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const products = await prisma.products.findMany({
      include: { categories: {
        select: {
          category_id: true,
          name: true
        }
      } },
    });
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
   const data: CreateProductInput = req.body 
   const product = await prisma.products.create({data})

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
