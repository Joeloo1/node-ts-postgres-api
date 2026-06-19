import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { userUpdateSchema } from "../Schema/userSchema";
import { sanitizeUser } from "../utils/sanitizeUser";
import logger from "../config/logger";
import { client as redis, scanDel } from "../config/redis";

const REDIS_TTL = 3600;
const getUserKey = (id: string) => `user:${id}`;
const clearUserCache = async () => {
  await scanDel("users:list:*");
};

/*
 * FOR THE ADMIN TO MANAGE THE USERS
 */
// get all the user
export const getAllUsers = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;
    const includeInactive = req.query.includeInactive === "true";
    const where = includeInactive ? {} : { active: true };

    logger.info("Admin fetching all users", { page, limit, includeInactive });

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.count({ where }),
    ]);

    logger.info(`Fetched ${users.length} users successfully`);
    res.status(200).json({
      status: "success",
      results: users.length,
      total,
      totalPages: Math.ceil(total / limit),
      page,
      data: { users: users.map(sanitizeUser) },
    });
  },
);

// get user
export const getUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = getUserKey(req.params.id);

    // check redis
    const cachedUser = await redis.get(cacheKey);
    if (cachedUser) {
      logger.info(`Serving user from cache`);
      return res.status(200).json({
        status: "success",
        source: "cache",
        data: { user: JSON.parse(cachedUser) },
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

    const safeUser = sanitizeUser(user);
    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(safeUser));

    logger.info(`User with ID:${req.params.id} fetched successfully`);
    res.status(200).json({
      status: "success",
      data: { user: safeUser },
    });
  },
);

// create user
export const createUser = (
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error("Attempt to create user via undefined route");
  res.status(500).json({
    status: "error",
    message: "This route is not defined! Please use /Signup instead",
  });
};

// update user
export const updateUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const parsed = userUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      return next(new AppError(parsed.error.issues[0].message, 400));
    }

    const { name, email, roles } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      logger.warn(`No user found with ID: ${req.params.id}`);
      return next(new AppError("No user found with this ID", 404));
    }

    logger.info(`Admin updating user with ID: ${req.params.id}`);
    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: { name, email, roles },
    });

    await redis.del(getUserKey(updatedUser.id));
    await redis.del(`auth:user:${updatedUser.id}`);
    await clearUserCache();

    logger.info(`User with ID: ${req.params.id} update successfully`);
    res.status(200).json({
      status: "success",
      data: {
        user: sanitizeUser(updatedUser),
      },
    });
  },
);

// delete user (soft-delete — preserves order history)
export const deleteUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;
    logger.info(`Admin soft-deleting user with ID: ${userId}`);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      logger.warn(`User with ID: ${userId} not found`);
      return next(new AppError("No user found with this ID", 404));
    }

    await prisma.user.update({
      where: { id: userId },
      data: { active: false },
    });

    await redis.del(getUserKey(userId));
    await redis.del(`auth:user:${userId}`);
    await clearUserCache();

    logger.info(`User with ID: ${userId} deactivated successfully`);
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);

/**
 * Audit Log Endpiont for ADMIN
 */
export const getAuditLogs = catchAsync(async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = 50;
  const skip = (page - 1) * limit;

  const where = {
    ...(req.query.adminId ? { adminId: req.query.adminId as string } : {}),
    ...(req.query.entityType
      ? { entityType: req.query.entityType as string }
      : {}),
    ...(req.query.action ? { action: req.query.action as string } : {}),
  };
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.count({ where }),
  ]);

  res.status(200).json({
    status: "success",
    data: { logs },
    total,
    page,
    totalPage: Math.ceil(total / limit),
  });
});
