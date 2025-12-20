import { Request, Response, NextFunction } from "express";

import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";

// Add item to cart
export const addItemToCart = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { product_id, quantity = 1 } = req.body;

    if (!product_id || quantity <= 0) {
      return next(
        new AppError("Please provide a valid product_id and quantity", 400)
      );
    }

    const product = await prisma.products.findUnique({
      where: { product_id },
    });

    if (!product) {
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

    res.status(201).json({
      status: "success",
      message: "Item added to cart",
    });
  }
);

// Get my Cart
export const getMyCart = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

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

    res.status(200).json({
      status: "success",
      data: {
        cart,
      },
    });
  }
);

// update cart
export const updateCartItem = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { itemId } = req.params;
    const { quantity } = req.body;

    if (quantity <= 0) {
      return next(new AppError("Quantity must be greater than Zero", 400));
    }

    const item = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cart.userId !== req.user!.id) {
      return next(new AppError("Cart items not found", 404));
    }

    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    res.status(200).json({
      status: "success",
      message: "Cart items updated ",
    });
  }
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
      return next(new AppError("Cart not found", 404));
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);

// Clear cart
export const clearCart = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;

    const cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      return next(new AppError("Cart not found", 404));
    }

    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    res.status(204).json({
      status: "success",
      data: null,
    });
  }
);
