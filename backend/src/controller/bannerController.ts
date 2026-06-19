import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";
import { createBannerSchema, updateBannerSchema } from "../Schema/bannerSchema";

const cacheKey = (position: string) => `banners:${position}`;
const BANNER_TTL = 300; // 5 minutes

// PUBLIC: get active banners by position
export const getBanners = catchAsync(async (req: Request, res: Response) => {
  const position = (req.query.position as string) ?? "HOME_HERO";
  const key = cacheKey(position);

  const cached = await redis.get(key);
  if (cached) {
    return res
      .status(200)
      .json({ status: "success", data: { banners: JSON.parse(cached) } });
  }

  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: {
      position,
      active: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }],
        },
      ],
    },
    orderBy: { order: "asc" },
  });

  await redis.setEx(key, BANNER_TTL, JSON.stringify(banners));
  res.status(200).json({ status: "success", data: { banners } });
});

// ADMIN: list all banners
export const adminGetBanners = catchAsync(
  async (_req: Request, res: Response) => {
    const banners = await prisma.banner.findMany({ orderBy: { order: "asc" } });
    res.status(200).json({ status: "success", data: { banners } });
  },
);

// ADMIN: create banner
export const createBanner = catchAsync(async (req: Request, res: Response) => {
  const data = createBannerSchema.parse(req.body);
  const banner = await prisma.banner.create({ data });
  await redis.del(cacheKey(banner.position));

  logger.info("Banner created", {
    bannerId: banner.id,
    position: banner.position,
  });

  res.status(201).json({ status: "success", data: { banner } });
});

// ADMIN: update banner
export const updateBanner = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const data = updateBannerSchema.parse(req.body);

    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Banner not found", 404));

    const banner = await prisma.banner.update({ where: { id }, data });

    // Invalidate cache for old and new positions
    await Promise.all([
      redis.del(cacheKey(existing.position)),
      banner.position !== existing.position &&
        redis.del(cacheKey(banner.position)),
    ]);

    res.status(200).json({ status: "success", data: { banner } });
  },
);

// ADMIN: delete banner
export const deleteBanner = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const existing = await prisma.banner.findUnique({ where: { id } });
    if (!existing) return next(new AppError("Banner not found", 404));

    await prisma.banner.delete({ where: { id } });
    await redis.del(cacheKey(existing.position));
    res.status(204).send();
  },
);
