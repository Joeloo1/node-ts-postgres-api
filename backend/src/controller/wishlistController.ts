import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { client as redis } from "../config/redis";
import logger from "../config/logger";

const REDIS_TTL = 300;
const wishlistKey = (userId: string) => `wishlist:${userId}`;

export const getWishlist = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;

    const cached = await redis.get(wishlistKey(userId));
    if (cached) {
      return res.status(200).json({
        ...JSON.parse(cached),
        source: "cached",
      });
    }

    const wishlist = await prisma.wishlist.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            product_id: true,
            name: true,
            price: true,
            discount: true,
            image: true,
            availability: true,
            stock: true,
            rating: true,
          },
        },
      },
    });

    const response = { status: "success", data: { wishlist } };
    await redis.setEx(wishlistKey(userId), REDIS_TTL, JSON.stringify(response));
    res.status(200).json(response);
  },
);

export const addToWishlist = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { product_id } = req.body as { product_id?: string };

    if (!product_id) return next(new AppError("product_id is required", 400));

    const product = await prisma.products.findFirst({
      where: { product_id, deletedAt: null },
    });

    if (!product) return next(new AppError("Product not found", 404));

    const existing = await prisma.wishlist.findUnique({
      where: { userId_product_id: { userId, product_id } },
    });

    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "Already in wishlist",
      });
    }

    const item = await prisma.wishlist.create({
      data: { userId, product_id },
    });

    await redis.del(wishlistKey(userId));
    logger.info("Product added to wishlist", { userId, product_id });

    const response = { stauts: "success", data: item };
    res.status(201).json(response);
  },
);

export const removeFromWishlist = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { productId } = req.params;

    const existing = await prisma.wishlist.findUnique({
      where: { userId_product_id: { userId, product_id: productId } },
    });

    if (!existing) return next(new AppError("Item not in wishlist", 404));

    await prisma.wishlist.delete({
      where: { userId_product_id: { userId, product_id: productId } },
    });

    await redis.del(wishlistKey(userId));
    logger.info("Product removed form wishlist", { userId, productId });

    const response = { stauts: "success", data: null };
    res.status(204).json(response);
  },
);

export const clearWishlist = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;

    await prisma.wishlist.deleteMany({
      where: { userId },
    });
    await redis.del(wishlistKey(userId));

    logger.info("Wishlist cleared", { userId });
    const response = { stauts: "success", data: null };
    res.status(204).json(response);
  },
);
