import { Request, Response } from "express";
import catchAsync from "../utils/catchAsync";
import { prisma } from "../config/database";
import { client as redis } from "../config/redis";

const REDIS_TTL = 3600;
const priceHistoryCacheKey = (productId: string) =>
  `price_history:${productId}`;

export const getProductPriceHistory = catchAsync(
  async (req: Request, res: Response) => {
    const { id: productId } = req.params;

    const cached = await redis.get(priceHistoryCacheKey(productId));
    if (cached) {
      return res.status(200).json({ ...JSON.parse(cached), source: "cached" });
    }

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

    res.status(200).json(responseData);
  },
);
