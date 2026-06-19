import { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "../config/database";
import logger from "../config/logger";

export const adminNotify = async (
  type: NotificationType,
  message: string,
  metadata?: Record<string, unknown>,
): Promise<void> => {
  try {
    await prisma.adminNotification.create({
      data: { type, message, metadata: metadata as Prisma.InputJsonValue },
    });
  } catch (err) {
    logger.warn("Failed to create admin notification", { type, message, err });
  }
};
