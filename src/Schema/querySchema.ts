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

    // Sorting
        sortBy: z.string().default("createdAt"),
        order: z.enum(["asc", "desc"]).default("desc"),

    // Field selection (optional)
        fields: z.string().optional(),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;