import { Request, Response, NextFunction, Router } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { prisma } from "../config/database";
import { updateUserSchema } from "../Schema/userSchema";
import { User } from "@prisma/client";
import { filterObj } from "../utils/filterObj";
import logger from "../config/logger";
import { client as redis } from "../config/redis";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const REDIS_TTL = 3600;
const getUserKey = (id: string) => `user:${id}`;
const getUserQueryKey = (query: any) => `users:list:${JSON.stringify(query)}`;

const clearUserCache = async () => {
  const keys = await redis.keys("users:list:*");
  if (keys.length > 0) await redis.del(keys);
};

// update user
export const updateMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.body.password || req.body.passwordConfirm) {
      logger.warn("User attempt to update password with updateMe routes");
      return next(
        new AppError(
          "This route is not for password updates, Please use /updateMyPassword",
          400,
        ),
      );
    }

    const userData = updateUserSchema.parse(req.body);

    const filteredBody = filterObj(userData, "name", "email", "phoneNumber");
    if (req.file) {
      filteredBody.profileImage = req.file.filename;
    }

    // Ensure at least one field is provided
    if (Object.keys(filteredBody).length === 0) {
      logger.warn("No valid fields provided for user update");
      return next(
        new AppError(
          "Provide at least one valid field to update (name, email, phoneNumber, profileImage).",
          400,
        ),
      );
    }

    logger.info(`User with ID: ${req.user!.id} is updating their profile`);
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: filteredBody,
    });

    logger.info(`User with ID: ${req.user!.id} updated successfully`);
    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      user: updatedUser,
    });
  },
);

// get Me
export const getMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info(`User with ID: ${req.user!.id} is fetching their profile`);
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
    });

    if (!user) {
      logger.warn(`user with ID:${req.user!.id} not found`);
      return next(new AppError("User not found", 404));
    }

    logger.info(`User with ID: ${req.user!.id} fetched successfully`);
    res.status(200).json({
      status: "success",
      data: user,
    });
  },
);

// delete Me
export const deleteMe = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    logger.info(`User with ID: ${req.user!.id} is deactivating their account`);
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { active: false },
    });

    logger.info(
      `User with ID: ${req.user!.id} successfully deactivated their account`,
    );
    res.status(200).json({
      status: "success",
      data: null,
    });
  },
);

// get all the user
export const getAllUsers = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = getUserQueryKey(req.query);

    // check redis
    const cachedUsers = await redis.get(cacheKey);
    if (cachedUsers) {
      logger.info(`Serving user from cache`);
      return res.status(200).json({
        status: "success",
        source: "cache",
        results: JSON.parse(cachedUsers).length,
        data: { users: JSON.parse(cachedUsers) },
      });
    }

    logger.info("Admin fetching all users");
    const users = await prisma.user.findMany();

    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(users));

    logger.info(`Fetched ${users.length} users successfully`);
    res.status(200).json({
      status: "success",
      results: users.length,
      data: {
        users,
      },
    });
  },
);

// get user
export const getUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = getUserQueryKey(req.query);

    // check redis
    const cachedUsers = await redis.get(cacheKey);
    if (cachedUsers) {
      logger.info(`Serving user from cache`);
      return res.status(200).json({
        status: "success",
        source: "cache",
        results: JSON.parse(cachedUsers).length,
        data: { users: JSON.parse(cachedUsers) },
      });
    }

    logger.info(`Admin fetching user with ID: ${req.params.id}`);
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!user) {
      logger.warn(`User with ID: ${req.params.id} not found`);
      return next(new AppError("There is no user with the ID", 404));
    }

    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(user));

    logger.info(`User with ID:${req.params.id} fetched successfully`);
    res.status(200).json({
      status: "success",
      data: { user },
    });
  },
);

// create user
export const createUser = (req: Request, res: Response, next: NextFunction) => {
  logger.error("Attempt to create user via undefined route");
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use /Signup instead",
  });
};

// update user
export const updateUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, roles } = req.body;

    logger.info(`Admin updating user with ID: ${req.params.id}`);
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, email, roles },
    });

    if (!updatedUser) {
      logger.warn(`No user found with ID: ${req.params.id}`);
      return next(new AppError("No user found with this ID", 404));
    }

    await redis.del(getUserKey(updatedUser.id));
    await clearUserCache();

    logger.info(`User with ID: ${req.params.id} update successfully`);
    res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
    });
  },
);

// delete user
export const deleteUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;
    logger.info(
      `Admin deleteing user with ID: ${req.params.id} from the database`,
    );
    await prisma.user.delete({
      where: { id: userId },
    });

    await redis.del(getUserKey(userId));

    logger.info(`User with ID: ${req.params.id} deleted successfully`);
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);
