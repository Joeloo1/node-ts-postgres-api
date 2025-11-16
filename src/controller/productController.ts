import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();


export const getProducts = async (req: Request, res: Response, next: NextFunction) => {
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
