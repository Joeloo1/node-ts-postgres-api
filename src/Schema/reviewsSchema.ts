import { z } from "zod";

// create reviews schema
export const createReviewSchema = z.object({
   product_id: z.string().uuid(), 
  content: z.string().optional(),
  rating: z.number().min(1).max(5),
});

// update reviews
export const updateReviewSchema = z.object({
  content: z.string().optional(),
  rating: z.number().min(1).max(5),
})

// Reviews ID
export const reviewIdShema = z.object({
    id: z.string().uuid("Invalid product ID format"),
})
   
