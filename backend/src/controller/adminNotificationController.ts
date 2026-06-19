import { Request, Response } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";

// ADMIN: get notifications (most recent 50) + unread count
export const getNotifications = catchAsync(
  async (_req: Request, res: Response) => {
    const [notifications, unreadCount] = await Promise.all([
      prisma.adminNotification.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.adminNotification.count({ where: { read: false } }),
    ]);

    res.status(200).json({
      status: "success",
      data: { notifications, unreadCount },
    });
  },
);

// ADMIN: mark a single notification as read
export const markNotificationRead = catchAsync(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    await prisma.adminNotification.update({
      where: { id },
      data: { read: true },
    });
    res.status(200).json({ status: "success" });
  },
);

// ADMIN: mark all notifications as read
export const markAllNotificationsRead = catchAsync(
  async (_req: Request, res: Response) => {
    await prisma.adminNotification.updateMany({
      where: { read: false },
      data: { read: true },
    });
    res.status(200).json({ status: "success" });
  },
);

// ADMIN: get unread count only (lightweight poll endpoint)
export const getUnreadCount = catchAsync(
  async (_req: Request, res: Response) => {
    const count = await prisma.adminNotification.count({ where: { read: false } });
    res.status(200).json({ status: "success", data: { count } });
  },
);
