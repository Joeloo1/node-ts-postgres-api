import { Request, Response } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import { Tier } from "@prisma/client";

const getTier = (points: number): Tier => {
  if (points >= 5000) return Tier.PLATINUM;
  if (points >= 2000) return Tier.GOLD;
  if (points >= 500) return Tier.SILVER;
  return Tier.BRONZE;
};

export const getMyLoyalty = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  let account = await prisma.loyaltyAccount.findUnique({
    where: { userId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!account) {
    account = await prisma.loyaltyAccount.create({
      data: { userId },
      include: { transactions: true },
    });
  }

  res.status(200).json({
    status: "success",
    data: {
      account: {
        points: account.points,
        lifetimePoints: account.lifetimePoints,
        tier: account.tier,
        nextTierAt: nextTierThreshold(account.tier),
        redemptionValue: (account.points / 100).toFixed(2),
        transactions: account.transactions,
      },
    },
  });
});

const nextTierThreshold = (tier: Tier): number | null => {
  const thresholds: Record<Tier, number | null> = {
    BRONZE: 500,
    SILVER: 2000,
    GOLD: 5000,
    PLATINUM: null,
  };
  return thresholds[tier];
};

export const awardLoyaltyPoints = async (
  userId: string,
  points: number,
  type: "EARNED" | "BONUS",
  description: string,
  orderId?: string,
): Promise<void> => {
  const account = await prisma.loyaltyAccount.upsert({
    where: { userId },
    create: {
      userId,
      points,
      lifetimePoints: type === "EARNED" ? points : 0,
    },
    update: {
      points: { increment: points },
      ...(type === "EARNED" && { lifetimePoints: { increment: points } }),
    },
  });

  await prisma.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      type,
      points,
      description,
      ...(orderId && { orderId }),
    },
  });

  const newTier = getTier(account.points);
  if (newTier !== account.tier) {
    await prisma.loyaltyAccount.update({
      where: { id: account.id },
      data: { tier: newTier },
    });
  }
};

export const redeemLoyaltyPoints = async (
  userId: string,
  points: number,
  orderId: string,
): Promise<void> => {
  await prisma.loyaltyAccount.update({
    where: { userId },
    data: { points: { decrement: points } },
  });

  const account = await prisma.loyaltyAccount.findUnique({ where: { userId } });
  if (!account) return;

  await prisma.loyaltyTransaction.create({
    data: {
      accountId: account.id,
      type: "REDEEMED",
      points: -points,
      description: `Redeemed for order #${orderId.slice(0, 8).toUpperCase()}`,
      orderId,
    },
  });
};
