import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";

import { prisma } from "../config/database";
import { updateUserSchema } from "../Schema/userSchema";
import { filterObj } from "../utils/filterObj";
import { sanitizeUser } from "../utils/sanitizeUser";
import logger from "../config/logger";
import { client as redis } from "../config/redis";

// declare global {
//   namespace Express {
//     interface Request {
//       user?: User;
//     }
//   }
// }

// const REDIS_TTL = 3600;
const getUserKey = (id: string) => `user:${id}`;
// const getUserQueryKey = (query: any) => `users:list:${JSON.stringify(query)}`;

// const clearUserCache = async () => {
//   await scanDel("users:list:*");
// };

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

    await redis.del(`auth:user:${req.user!.id}`);

    logger.info(`User with ID: ${req.user!.id} updated successfully`);
    res.status(200).json({
      status: "success",
      message: "User updated successfully",
      user: sanitizeUser(updatedUser),
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
      data: sanitizeUser(user),
    });
  },
);

// delete Me
export const deleteMe = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const userId = req.user!.id;
    logger.info(`User with ID: ${userId} is deactivating their account`);
    await prisma.user.update({
      where: { id: userId },
      data: { active: false },
    });

    await redis.del(getUserKey(userId));
    await redis.del(`auth:user:${userId}`);

    logger.info(
      `User with ID: ${userId} successfully deactivated their account`,
    );
    res.status(200).json({
      status: "success",
      data: null,
    });
  },
);
