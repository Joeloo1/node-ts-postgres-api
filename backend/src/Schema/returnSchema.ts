import { z } from "zod";

export const createReturnSchema = z.object({
  reason: z
    .string()
    .min(10, { message: "Please explain why you want to return this order" }),
});

export const updateReturnSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED", "COMPLETED"]),
  adminNote: z.string().max(500).optional(),
});
