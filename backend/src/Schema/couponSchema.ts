import { z } from "zod";

export const validateCouponSchema = z.object({
  code: z.string().min(1).max(50),
  orderTotal: z
    .number()
    .positive({ message: "orderTotal must be a positive number" }),
});

export const createCouponSchema = z.object({
  code: z.string().min(2).max(50).toUpperCase(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive(),
  minOrderTotal: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  active: z.boolean().optional(),
});

export const updateCouponSchema = createCouponSchema.partial();
