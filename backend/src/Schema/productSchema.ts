import { z } from "zod";

// create products
export const createProductSchema = z.object({
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
  rating: z.number().min(0).max(5).optional(),
  stock: z.number().int().min(0).optional().default(0),
  category_id: z.number().int().optional(),
});

export const productIdSchema = z.object({
  id: z.string().uuid("Invalid product ID format"),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, { message: "A product must have a name" })
    .max(255)
    .trim()
    .optional(),

  description: z.string().optional(),

  price: z.number().positive("Price must be positive").optional(),

  unit: z.string().max(50).optional(),

  image: z.string().optional(),

  images: z.array(z.string()).optional(),

  discount: z.number().min(0).max(100).optional(),

  availability: z.boolean().optional(),

  brand: z.string().max(100).optional(),

  rating: z.number().min(0).max(5).optional(),

  stock: z.number().int().min(0).optional(),

  category_id: z.number().int().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
