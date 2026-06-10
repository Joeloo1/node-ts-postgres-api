import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database";
import catchAsync from "../utils/catchAsync";
import logger from "../config/logger";
import { contactSchema } from "../Schema/contactSchema";
import { emailQueue } from "../jobs/emailQueue";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? process.env.EMAIL_FROM ?? "";

export const submitContact = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const data = contactSchema.parse(req.body);

    await prisma.contactMessage.create({ data });

    if (ADMIN_EMAIL) {
      await emailQueue
        .add("send-email", {
          email: ADMIN_EMAIL,
          subject: `[Contact] ${data.subject}`,
          template: "contactNotification",
          templateData: {
            senderName: data.name,
            senderEmail: data.email,
            subject: data.subject,
            message: data.message,
          },
        })
        .catch(() => {
          logger.warn("Failed to queue contact notification email");
        });
    }
    logger.info("Contact message received", {
      email: data.email,
      subject: data.subject,
    });
    res.status(201).json({
      status: "success",
      message: "Your message has been received. We'll get back to you shortly.",
    });
  },
);

export const getContractMessages = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const unreadOnly = req.query.unread === "true";
    const message = await prisma.contactMessage.findMany({
      where: unreadOnly ? { read: false } : {},
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.status(200).json({
      status: "success",
      result: message.length,
      data: { message },
    });
  },
);

export const markRead = catchAsync(
  async (req: Request, res: Response, _next: NextFunction) => {
    const id = req.params.id;
    await prisma.contactMessage.update({
      where: { id },
      data: { read: true },
    });

    res.status(200).json({
      status: "success",
      data: null,
    });
  },
);
