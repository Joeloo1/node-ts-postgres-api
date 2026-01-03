import { Request, Response, NextFunction } from "express";

import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import logger from "../config/logger";

// Add item to cart
export const addItemToCart = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { product_id, quantity = 1 } = req.body;
    logger.info("User adding items to cart", { userId, product_id, quantity });

    if (!product_id || quantity <= 0) {
      logger.warn("Invalid product_id or quantity provided", {
        userId,
        product_id,
        quantity,
      });
      return next(
        new AppError("Please provide a valid product_id and quantity", 400),
      );
    }

    const product = await prisma.products.findUnique({
      where: { product_id },
    });

    if (!product) {
      logger.warn("Product not found", { userId, product_id });
      return next(new AppError("Product not found", 404));
    }

    await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.upsert({
        where: { userId },
        update: {},
        create: { userId },
      });

      const existingItem = await tx.cartItem.findFirst({
        where: {
          cartId: cart.id,
          product_id,
        },
      });

      if (existingItem) {
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + quantity,
          },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            product_id,
            quantity,
          },
        });
      }
    });

    logger.info("Items added to cart successfully", {
      userId,
      product_id,
      quantity,
    });
    res.status(201).json({
      status: "success",
      message: "Item added to cart",
    });
  },
);

// Get my Cart
export const getMyCart = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    logger.info("User fetching cart", { userId });
    let cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });
    }

    logger.info("Cart fetched successfully", { userId });
    res.status(200).json({
      status: "success",
      data: {
        cart,
      },
    });
  },
);

// update cart
export const updateCartItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { itemId } = req.params;
    const { quantity } = req.body;

    logger.info("User updating cart items", {
      userId: req.user!.id,
      itemId,
      quantity,
    });
    if (quantity <= 0) {
      logger.warn("Invalid quantity provided for cart item update");
      return next(new AppError("Quantity must be greater than Zero", 400));
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== req.user!.id) {
      logger.warn("art item not found", { userInfo: req.user!.id, itemId });
      return next(new AppError("Cart items not found", 404));
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    logger.info("Cart items updated successfully", {
      userId: req.user!.id,
      itemId,
      quantity,
    });
    res.status(200).json({
      status: "success",
      message: "Cart items updated ",
    });
  },
);

// remove cart items
export const removeCartItems = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { itemId } = req.params;

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== req.user!.id) {
      logger.warn("Cart item not found");
      return next(new AppError("Cart not found", 404));
    }

    logger.info("user removing cart items", { userId: req.user!.id, itemId });
    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    logger.info("Cart items removed sucessfully");
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);

// Clear cart
export const clearCart = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      logger.warn("Cart not found for user", { userId });
      return next(new AppError("Cart not found", 404));
    }

    logger.info("User Clearing cart", { userId });
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    logger.info("Cart cleared successfully");
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
