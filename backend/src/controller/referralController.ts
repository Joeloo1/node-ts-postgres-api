import { Request, Response } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";

export const getMyReferral = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    include: {
      referee: { select: { name: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const referralLink = user?.referralCode
    ? `${process.env.CLIENT_URL}/signup?ref=${user.referralCode}`
    : null;

  res.status(200).json({
    status: "success",
    data: {
      referralCode: user?.referralCode ?? null,
      referralLink,
      totalReferrals: referrals.length,
      completedReferrals: referrals.filter((r) => r.status === "COMPLETED").length,
      referrals: referrals.map((r) => ({
        refereeName: r.referee.name,
        refereeJoinedAt: r.referee.createdAt,
        status: r.status,
        completedAt: r.completedAt,
      })),
    },
  });
});
