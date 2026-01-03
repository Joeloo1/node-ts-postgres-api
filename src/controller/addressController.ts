import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import {
  createAddressSchema,
  updateAddressSchema,
} from "../Schema/addressSchema";
import logger from "../config/logger";

// create Address
export const createAddress = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const addressData = createAddressSchema.parse(req.body);
    const userId = req.user!.id;

    logger.info("User creating a new address", { userId });
    const Address = await prisma.address.create({
      data: {
        ...addressData,
        userId,
      },
    });

    logger.info("Address created sucessfully");
    res.status(201).json({
      status: "success",
      data: {
        Address,
      },
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
    logger.info("User fetching all addresses", { userId: req.user!.id });
    const address = await prisma.address.findMany({
      where: { userId: req.user!.id },
    });

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

    logger.info("Address fetched successfully");
    res.status(200).json({
      status: "success",
      data: {
        address,
      },
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

    logger.info("Address deleted successfully", { addressId: req.params.id });
    res.status(200).json({
      status: "success",
      data: null,
    });
  },
);
