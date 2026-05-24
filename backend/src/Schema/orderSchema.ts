import { z } from "zod";

export const orderItemSchema = z.object({
  product_id: z.string().uuid({ message: "product_id must be a valid UUID" }),
  quantity: z
    .number()
    .int({ message: "quantity must be an integer" })
    .positive({ message: "quantity must be greater than 0" }),
});

export const createOrderSchema = z.object({
  items: z
    .array(orderItemSchema)
    .min(1, { message: "Order must contain at least one item" }),
});

export const updateProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  unit: z.string().max(50).optional(),
  image: z.string().url().optional(),
  discount: z.number().min(0).max(100).optional(),
  stock: z.number().int().min(0).optional(),
  availability: z.boolean().optional(),
  brand: z.string().max(100).optional(),
  category_id: z.number().int().positive().optional(),
});
