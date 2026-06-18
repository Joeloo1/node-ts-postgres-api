import { z } from "zod";

export const productQuerySchema = z.object({
  //  pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),

  // filter
  name: z.string().optional(),
  brand: z.string().optional(),
  category_id: z.coerce.number().int().optional(),
  availability: z.coerce.boolean().optional(),

  // Range filters
  price_gte: z.coerce.number().positive().optional(),
  price_lte: z.coerce.number().positive().optional(),
  rating_gte: z.coerce.number().min(0).max(5).optional(),
  discount_gte: z.coerce.number().min(0).max(100).optional(),

  // Tag collection filter (tag slug)
  tag: z.string().optional(),

  // Attribute filter — comma-separated "Key:Value" pairs e.g. "Color:Red,Size:M"
  attributes: z.string().optional(),

  // Sorting
  sortBy: z.string().default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),

  // Field selection (optional)
  fields: z.string().optional(),

  // Include gallery images in list response (default false for lighter payloads)
  includeImages: z.coerce.boolean().optional().default(false),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;
