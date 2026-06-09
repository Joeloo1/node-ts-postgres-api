import { z } from "zod";
import { sanitizedString } from "../utils/sanitize";

export const createQuestionSchema = z.object({
  question: sanitizedString(z.string().min(5).max(500)),
});

export const createAnswerSchema = z.object({
  answer: sanitizedString(z.string().min(1).max(1000)),
});

export const questionIdSchema = z.object({
  id: z.string().uuid("Invalid question ID"),
});

export const answerIdSchema = z.object({
  id: z.string().uuid("Invalid answer ID"),
});
