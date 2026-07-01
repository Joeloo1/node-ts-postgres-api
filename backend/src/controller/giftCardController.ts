import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import { emailQueue } from "../jobs/emailQueue";
import logger from "../config/logger";
import crypto from "crypto";
import { z } from "zod";

const purchaseSchema = z.object({
  amount: z.number().min(5).max(500),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().optional(),
});

const generateCode = (): string => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const bytes = crypto.randomBytes(12);
  for (let i = 0; i < 12; i++) {
    code += chars[bytes[i] % chars.length];
    if (i === 3 || i === 7) code += "-";
  }
  return code;
};

export const purchaseGiftCard = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { amount, recipientEmail, recipientName } = purchaseSchema.parse(req.body);

    const code = generateCode();

    const giftCard = await prisma.giftCard.create({
      data: {
        code,
        balance: amount,
        initialBalance: amount,
        purchasedById: userId,
        recipientEmail: recipientEmail ?? null,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    if (recipientEmail) {
      const purchaser = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      await emailQueue
        .add("send-email", {
          email: recipientEmail,
          subject: "You've received a Northline Gift Card! 🎁",
          template: "giftCardDelivery",
          templateData: {
            recipientName: recipientName ?? "there",
            senderName: purchaser?.name ?? "Someone",
            code: giftCard.code,
            amount: amount.toFixed(2),
            shopUrl: `${process.env.CLIENT_URL}`,
            expiresAt: giftCard.expiresAt
              ? new Date(giftCard.expiresAt).toLocaleDateString()
              : null,
            year: new Date().getFullYear(),
          },
        })
        .catch((err) =>
          logger.warn("Failed to queue gift card delivery email", { err }),
        );
    }

    logger.info("Gift card purchased", { userId, code, amount });
    res.status(201).json({
      status: "success",
      data: { giftCard: { code: giftCard.code, balance: giftCard.balance } },
    });
  },
);

export const checkGiftCardBalance = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { code } = req.params;

    const giftCard = await prisma.giftCard.findUnique({
      where: { code: code.toUpperCase() },
      select: { balance: true, active: true, expiresAt: true },
    });

    if (!giftCard || !giftCard.active) {
      return next(new AppError("Gift card not found or inactive", 404));
    }

    if (giftCard.expiresAt && giftCard.expiresAt < new Date()) {
      return next(new AppError("Gift card has expired", 400));
    }

    res.status(200).json({
      status: "success",
      data: {
        balance: giftCard.balance,
        expiresAt: giftCard.expiresAt,
      },
    });
  },
);

// User: list my gift cards (purchased by me or received at my email)
export const getMyGiftCards = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const userEmail = req.user!.email;

    const giftCards = await prisma.giftCard.findMany({
      where: {
        OR: [
          { purchasedById: userId },
          { recipientEmail: userEmail },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        code: true,
        balance: true,
        initialBalance: true,
        recipientEmail: true,
        active: true,
        expiresAt: true,
        createdAt: true,
        purchasedBy: { select: { name: true, email: true } },
      },
    });

    res.status(200).json({ status: "success", data: { giftCards } });
  },
);

// Admin: list all gift cards
export const adminGetGiftCards = catchAsync(
  async (_req: Request, res: Response) => {
    const giftCards = await prisma.giftCard.findMany({
      orderBy: { createdAt: "desc" },
      include: { purchasedBy: { select: { name: true, email: true } } },
    });
    res.status(200).json({ status: "success", data: { giftCards } });
  },
);

// Admin: revoke a gift card
export const adminRevokeGiftCard = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const giftCard = await prisma.giftCard.findUnique({ where: { id } });
    if (!giftCard) return next(new AppError("Gift card not found", 404));

    await prisma.giftCard.update({ where: { id }, data: { active: false } });
    res.status(200).json({ status: "success", message: "Gift card revoked" });
  },
);
