import { z } from "zod";
import { sanitizedString } from "../utils/sanitize";

export const createVariantSchema = z.object({
  name: sanitizedString(z.string().min(1).max(100)),
  priceModifier: z.number().default(0),
  stock: z.number().int().min(0).default(0),
  availability: z.boolean().default(true),
});

export const updateVariantSchema = createVariantSchema.partial();

export const variantIdSchema = z.object({
  id: z.string().uuid("Invalid variant ID"),
});
