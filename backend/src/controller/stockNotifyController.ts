import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";
import { stockNotifySchema } from "../Schema/stockNotifySchema";
import { emailQueue } from "../jobs/emailQueue";

export const subscribeStockNotify = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, product_id } = stockNotifySchema.parse(req.body);

    const product = await prisma.products.findFirst({
      where: { product_id, deletedAt: null },
    });

    if (!product) return next(new AppError("Product not found", 404));

    if (product.stock > 0) {
      return next(new AppError("This product is already in stock", 400));
    }

    const existing = await prisma.backInStockSubscription.findUnique({
      where: { email_product_id: { email, product_id } },
    });

    if (existing) {
      return res.status(200).json({
        status: "success",
        message: "You are already subscribe for this product",
      });
    }

    await prisma.backInStockSubscription.create({
      data: {
        email,
        product_id,
        userId: req.user?.id ?? null,
      },
    });

    logger.info("Back-in-stock subscription created", { email, product_id });
    res.status(201).json({
      status: "success",
      message: `We'll notify you at ${email} when this product is back in stock.`,
    });
  },
);

export const triggerStockNotification = async (
  productId: string,
): Promise<void> => {
  const subscribers = await prisma.backInStockSubscription.findMany({
    where: { product_id: productId, notified: false },
    include: { product: { select: { name: true } } },
  });

  if (subscribers.length === 0) return;

  for (const sub of subscribers) {
    await emailQueue
      .add("send-email", {
        email: sub.email,
        subject: `${sub.product.name} is back in stock!`,
        template: "backInStock",
        templateData: {
          productName: sub.product.name,
          productUrl: `${process.env.CLIENT_URL}/products/${productId}`,
        },
      })
      .catch(() => {
        logger.warn("Failed to queue back-in-stock email", {
          email: sub.email,
        });
      });

    await prisma.backInStockSubscription.updateMany({
      where: { product_id: productId, notified: false },
      data: { notified: true },
    });

    logger.info(`Back-in-stock notifications sent`, {
      productId,
      count: subscribers.length,
    });
  }
};
