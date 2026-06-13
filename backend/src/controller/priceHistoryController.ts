import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";
import logger from "../config/logger";

const REDIS_TTL = 3600;
const priceHistoryCacheKey = (productId: string) =>
  `price_history:${productId}`;

export const getProductPriceHistory = catchAsync(
  async (req: Request, res: Response) => {
    const { id: productId } = req.params;

    const cached = await redis.get(priceHistoryCacheKey(productId));
    if (cached) {
      logger.info("Serving price history from cache", { productId });
      return res.status(200).json({ ...JSON.parse(cached), source: "cached" });
    }

    logger.info("Fetching price history from DB", { productId });
    const history = await prisma.priceHistory.findMany({
      where: { product_id: productId },
      orderBy: { createdAt: "asc" },
      take: 90,
      select: { price: true, createdAt: true },
    });

    const responseData = { status: "success", data: { history } };
    await redis.setEx(
      priceHistoryCacheKey(productId),
      REDIS_TTL,
      JSON.stringify(responseData),
    );

    logger.info("Price history fetched", { productId, entries: history.length });
    res.status(200).json(responseData);
  },
);
