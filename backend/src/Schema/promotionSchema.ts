import { z } from "zod";

export const createPromotionSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["FLASH_SALE", "PERCENTAGE_OFF_CATEGORY"]),
  value: z.number().positive().max(100),
  categoryId: z.number().int().positive().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
});

export const updatePromotionSchema = createPromotionSchema.partial();

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
