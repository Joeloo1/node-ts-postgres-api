import { z } from "zod"

// create products
export const createProductSchema = z.object({
    // product_id: z.number(),
    name: z
    .string()
    .min(1, { message: "A product must have a name" })
    .max(255)
    .trim(),

    description: z.string(),
  price: z.number().positive("Price must be positive"),
    unit: z.string().max(50).optional(),
    image: z.string().url().optional(),
   discount: z.number().min(0).max(100).optional(),
    availability: z.boolean().optional().default(true),
    brand: z.string().max(100).optional(),
    rating: z.number().min(0).max(5),
    category_id: z.number().int().optional(),
    created_at: z.date().default(() => new Date()),
    updated_at: z.date().default(() => new Date()),
})

export type CreateProductInput = z.infer<typeof createProductSchema>;
