import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { createReviewSchema } from "../Schema/reviewsSchema";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { client as redis, scanDel } from "../config/redis";

const REDIS_TTL = 3600;
const getReviewKey = (id: string) => `review:${id}`;

const getReviewQueryKey = (query: Record<string, unknown>) => {
  const sorted = Object.keys(query)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = query[k];
      return acc;
    }, {});
  return `reviews:list:${JSON.stringify(sorted)}`;
};

const clearReviewCache = async () => {
  await scanDel("reviews:list:*");
};

const syncProductRating = async (productId: string) => {
  const result = await prisma.review.aggregate({
    where: { product_id: productId },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const avg = result._avg.rating ?? null;
  await prisma.products.update({
    where: { product_id: productId },
    data: { rating: avg },
  });
  await redis.del(`product:${productId}`);
  await scanDel("products:list:*");
};

// create review
export const createReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const { product_id, rating, content } = createReviewSchema.parse(req.body);

    const existingReview = await prisma.review.findUnique({
      where: {
        userId_product_id: { userId, product_id },
      },
    });

    if (existingReview) {
      logger.warn(`User already reviewed this product`);
      return next(new AppError("You already reviewed this product", 400));
    }

    const varifiedPurchase = await prisma.orderItem.findFirst({
      where: {
        product_id,
        order: {
          userId,
          status: "DELIVERED",
        },
      },
    });

    if (!varifiedPurchase) {
      return next(
        new AppError(
          "You can only review products you have purchased and received",
          403,
        ),
      );
    }

    logger.info(
      `Creating review for product ID: ${product_id} by user ID: ${userId}`,
    );
    const review = await prisma.review.create({
      data: {
        userId,
        product_id,
        rating,
        content,
        verifiedPurchase: true,
      },
    });

    await clearReviewCache();
    await syncProductRating(product_id);

    logger.info("Review created successfully");
    res.status(201).json({
      status: "success",
      data: {
        review,
      },
    });
  },
);

// Update review
export const updateReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { content, rating } = req.body;
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
    });

    if (!review || review.userId !== req.user!.id) {
      logger.warn(
        `Review with ID: ${req.params.id} not found or user unauthorized`,
      );
      return next(new AppError("Review not found", 404));
    }

    logger.info(`Updating review with ID: ${req.params.id}`);
    const updatedReview = await prisma.review.update({
      where: { id: req.params.id },
      data: {
        content,
        rating,
      },
    });

    await redis.del(getReviewKey(review.id));
    await clearReviewCache();
    await syncProductRating(review.product_id);

    logger.info(`Review with ID: ${req.params.id} updated successfully`);
    res.status(200).json({
      status: "success",
      data: {
        updatedReview,
      },
    });
  },
);

// Get reviews for products
export const getProductReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = getReviewQueryKey(req.query);

    const cachedDate = await redis.get(cacheKey);
    if (cachedDate) {
      logger.info("Serving review from cache");
      return res
        .status(200)
        .json({ ...JSON.parse(cachedDate), source: "cached" });
    }

    const productId =
      typeof req.query.product_id === "string"
        ? req.query.product_id
        : undefined;
    if (!productId) {
      return next(new AppError("Query parameter product_id is required", 400));
    }

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    logger.info(`Fetching reviews for product ID: ${productId}`);

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { product_id: productId },
        include: {
          user: { select: { id: true, name: true } },
          votes: { select: { helpful: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where: { product_id: productId } }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const responseData = {
      status: "success",
      data: { reviews },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

    await redis.setEx(cacheKey, REDIS_TTL, JSON.stringify(responseData));

    logger.info(`Reviews for Product ID: ${productId} fetched successfully`);
    res.status(200).json(responseData);
  },
);

// delete Review
export const deleteReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const review = await prisma.review.findUnique({
      where: { id: req.params.id },
    });

    if (!review || review.userId !== req.user!.id) {
      logger.warn(
        `Review with ID: ${req.params.id} not found or user unauthorized`,
      );
      return next(new AppError("Review not found", 404));
    }

    logger.info(`Deleting review with ID: ${req.params.id}`);
    await prisma.review.delete({
      where: { id: req.params.id },
    });

    await redis.del(getReviewKey(review.id));
    await clearReviewCache();
    await syncProductRating(review.product_id);

    logger.info(`Review with ID: ${req.params.id} deleted successfully`);
    res.status(204).json({
      status: "success",
      data: null,
    });
  },
);

// Vote on a review (helpful / not helpful)
export const voteReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const reviewId = req.params.id;
    const helpful: boolean = Boolean(req.body.helpful);

    const review = await prisma.review.findUnique({ where: { id: reviewId } });

    if (!review) return next(new AppError("Review not found", 404));

    if (review.userId === userId)
      return next(new AppError("You cannot vote on your own review", 400));

    await prisma.reviewVote.upsert({
      where: { userId_reviewId: { userId, reviewId } },
      create: { userId, reviewId, helpful },
      update: { helpful },
    });

    await clearReviewCache();
    res.status(200).json({ status: "success", data: null });
  },
);

// Remove vote from a review
export const unvoteReview = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.user!.id;
    const reviewId = req.params.id;

    const existing = await prisma.reviewVote.findUnique({
      where: { userId_reviewId: { userId, reviewId } },
    });
    if (!existing) return next(new AppError("Vote not found", 404));

    await prisma.reviewVote.delete({
      where: { userId_reviewId: { userId, reviewId } },
    });
    await clearReviewCache();

    res.status(204).json({ status: "success", data: null });
  },
);
