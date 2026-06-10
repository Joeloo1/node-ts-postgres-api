import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import logger from "../config/logger";
import { subscribeSchema } from "../Schema/newsletterSchema";

export const subscribe = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { email } = subscribeSchema.parse(req.body);

    const existing = await prisma.newsletterSubscription.findUnique({
      where: { email },
    });

    if (existing) {
      if (!existing.active) {
        await prisma.newsletterSubscription.update({
          where: { email },
          data: { active: true },
        });
        logger.info("Newsletter subscription re-activated", { email });
      }
      return res.status(200).json({
        status: "success",
        message: "You,re subscribed!",
      });
    }

    await prisma.newsletterSubscription.create({ data: { email } });
    logger.info("New newsletter subscription", { email });

    const response = {
      status: "success",
      message: "You're subscribed! we'll be in touch ",
    };
    res.status(201).json(response);
  },
);

export const unsubscribe = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { email } = subscribeSchema.parse(req.body);

    await prisma.newsletterSubscription.updateMany({
      where: { email },
      data: { active: false },
    });

    logger.info("Newsletter unsubscription", { email });
    const response = {
      status: "success",
      message: "You have been unsubscribed.",
    };
    res.status(201).json(response);
  },
);

export const getSubscribers = catchAsync(
  async (_req: Request, res: Response, _next: NextFunction) => {
    const subscribers = await prisma.newsletterSubscription.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    const response = {
      status: "success",
      result: subscribers.length,
      data: subscribers,
    };

    res.status(200).json(response);
  },
);
