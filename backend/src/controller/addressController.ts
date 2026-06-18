import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../Schema/addressSchema";
import logger from "../config/logger";
import { client as redis } from "../config/redis";

const REDIS_TTL = 3600;
const getAddressKey = (id: string) => `address:${id}`;

/** Per-user list cache — must NOT share keys with category/product caches */
const getAddressListKey = (userId: string, query: unknown) =>
  `addresses:list:${userId}:${JSON.stringify(query ?? {})}`;

const clearAddressListCache = async (userId: string) => {
  const keys = await redis.keys(`addresses:list:${userId}:*`);
  if (keys.length > 0) await redis.del(keys);
};
// create Address
export const createAddress = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const addressData = createAddressSchema.parse(req.body);
    const userId = req.user!.id;

    logger.info("User creating a new address", { userId });

    // Auto-default if this is the user's first address
    const existingCount = await prisma.address.count({ where: { userId } });
    const isDefault = existingCount === 0;

    const Address = await prisma.address.create({
      data: { ...addressData, userId, isDefault },
    });

    await clearAddressListCache(userId);

    logger.info("Address created successfully");
    res.status(201).json({
      status: "success",
      data: { Address },
    });
  },
);

// update Address
export const updateAddress = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const addressId = req.params.id;
    const userId = req.user!.id;

    const updateData = updateAddressSchema.parse(req.body);

    logger.info("User updating an address", { userId, addressId });
    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!addressId || address?.userId !== userId) {
      logger.warn("Address not found or user unauthorized", {
        userId,
        addressId,
      });
      return next(new AppError("Address not found or unauthorized", 404));
    }

    logger.info("User authorized, proceeding with update", {
      userId,
      addressId,
    });
    const updateAddress = await prisma.address.update({
      where: { id: addressId },
      data: updateData,
    });

    await redis.del(getAddressKey(addressId));
    await clearAddressListCache(userId);

    logger.info("Address updated successfully");
    res.status(200).json({
      status: "success",
      data: {
        address: updateAddress,
      },
    });
  },
);

// Get All Address
export const getAllAddresses = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const cacheKey = getAddressListKey(userId, req.query);

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info("Serving addresses from cache", { userId });
      return res.status(200).json({
        status: "success",
        source: "cache",
        data: {
          address: JSON.parse(cachedData),
        },
      });
    }
    logger.info("User fetching all addresses", { userId });
    const address = await prisma.address.findMany({
      where: { userId },
    });

    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(address));

    logger.info(`Fetched ${address.length} addresses`);
    res.status(200).json({
      status: "success",
      result: address.length,
      data: {
        address,
      },
    });
  },
);

// Get single Address
export const getAddress = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const addressId = req.params.id;

    const cacheKey = getAddressKey(addressId);

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      logger.info("Serving address from cache", { addressId });
      return res.status(200).json({
        status: "success",
        source: "cache",
        data: {
          address: JSON.parse(cachedData),
        },
      });
    }
    const address = await prisma.address.findUnique({
      where: { id: req.params.id },
    });

    if (!address || address.userId !== req.user!.id) {
      logger.warn("Address not found or User not authorized", {
        userId: req.user!.id,
        addressId: req.params.id,
      });
      return next(new AppError("Address not found", 404));
    }

    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(address));

    logger.info("Address fetched successfully");
    res.status(200).json({
      status: "success",
      data: {
        address,
      },
    });
  },
);

// Set default address — unsets all others for this user first
export const setDefaultAddress = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const addressId = req.params.id;
    const userId = req.user!.id;

    const address = await prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address || address.userId !== userId) {
      return next(new AppError("Address not found or unauthorized", 404));
    }

    // Atomic: clear all defaults then set the chosen one
    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    await clearAddressListCache(userId);
    await redis.del(getAddressKey(addressId));

    logger.info("Default address set", { userId, addressId });
    res.status(200).json({
      status: "success",
      message: "Default address updated",
    });
  },
);

// Delete Address
export const deleteAddress = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const address = await prisma.address.findUnique({
      where: { id: req.params.id },
    });

    if (!address || address.userId !== req.user!.id) {
      logger.warn("Address not found or user unauthorized", {
        userId: req.user!.id,
        addressId: req.params.id,
      });
      return next(new AppError("Address not found or unauthorized", 404));
    }

    logger.info("Authorized user deleting address", {
      userId: req.user!.id,
      addressId: req.params.id,
    });
    await prisma.address.delete({
      where: { id: req.params.id },
    });

    await redis.del(getAddressKey(address.id));
    await clearAddressListCache(req.user!.id);

    logger.info("Address deleted successfully", { addressId: req.params.id });
    res.status(200).json({
      status: "success",
      data: null,
    });
  },
);
