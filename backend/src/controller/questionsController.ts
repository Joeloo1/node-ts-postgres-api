import { Request, Response, NextFunction } from "express";
import catchAsync from "../utils/catchAsync";
import AppError from "../utils/AppError";
import {
  createQuestionSchema,
  createAnswerSchema,
} from "../Schema/questionSchema";
import { prisma } from "../config/database";
import logger from "../config/logger";
import { client as redis, scanDel } from "../config/redis";

const REDIS_TTL = 1800;
const questionsCacheKey = (productId: string) => `questions:${productId}`;

export const getProductQuestions = catchAsync(
  async (req: Request, res: Response) => {
    const { id: productId } = req.params;
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(20, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const cacheKey = `${questionsCacheKey(productId)}:${page}:${limit}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.status(200).json({ ...JSON.parse(cached), source: "cached" });
    }

    const [questions, total] = await Promise.all([
      prisma.productQuestion.findMany({
        where: { product_id: productId },
        include: {
          user: { select: { id: true, name: true } },
          answers: {
            include: { user: { select: { id: true, name: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.productQuestion.count({ where: { product_id: productId } }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const responseData = {
      status: "success",
      data: { questions },
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
    res.status(200).json(responseData);
  },
);

export const createQuestion = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: productId } = req.params;
    const userId = req.user!.id;
    const { question } = createQuestionSchema.parse(req.body);

    const product = await prisma.products.findUnique({
      where: { product_id: productId },
    });
    if (!product) return next(new AppError("Product not found", 404));

    logger.info(`User ${userId} asking question on product ${productId}`);
    const created = await prisma.productQuestion.create({
      data: { product_id: productId, userId, question },
      include: {
        user: { select: { id: true, name: true } },
        answers: { include: { user: { select: { id: true, name: true } } } },
      },
    });

    await scanDel(`questions:${productId}:*`);
    res.status(201).json({ status: "success", data: { question: created } });
  },
);

export const answerQuestion = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id: questionId } = req.params;
    const userId = req.user!.id;
    const { answer } = createAnswerSchema.parse(req.body);

    const questionRecord = await prisma.productQuestion.findUnique({
      where: { id: questionId },
    });
    if (!questionRecord) return next(new AppError("Question not found", 404));

    logger.info(`User ${userId} answering question ${questionId}`);
    const created = await prisma.productAnswer.create({
      data: { questionId, userId, answer },
      include: { user: { select: { id: true, name: true } } },
    });

    await scanDel(`questions:${questionRecord.product_id}:*`);
    res.status(201).json({ status: "success", data: { answer: created } });
  },
);

export const deleteQuestion = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const isAdmin = req.user!.roles === "ADMIN";

    const question = await prisma.productQuestion.findUnique({ where: { id } });
    if (!question) return next(new AppError("Question not found", 404));
    if (question.userId !== userId && !isAdmin)
      return next(new AppError("Unauthorized", 403));

    await prisma.productQuestion.delete({ where: { id } });
    await scanDel(`questions:${question.product_id}:*`);

    res.status(204).json({ status: "success", data: null });
  },
);

export const deleteAnswer = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const userId = req.user!.id;
    const isAdmin = req.user!.roles === "ADMIN";

    const answerRecord = await prisma.productAnswer.findUnique({
      where: { id },
      include: { question: { select: { product_id: true } } },
    });
    if (!answerRecord) return next(new AppError("Answer not found", 404));
    if (answerRecord.userId !== userId && !isAdmin)
      return next(new AppError("Unauthorized", 403));

    await prisma.productAnswer.delete({ where: { id } });
    await scanDel(`questions:${answerRecord.question.product_id}:*`);

    res.status(204).json({ status: "success", data: null });
  },
);
