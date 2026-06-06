import { z } from "zod";
import { sanitizedString } from "../utils/sanitize";

// create reviews schema
export const createReviewSchema = z.object({
  product_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  content: sanitizedString(z.string().max(2000)).optional(),
});

// update reviews
export const updateReviewSchema = z.object({
  content: sanitizedString(z.string().max(2000)).optional(),
  rating: z.number().min(1).max(5),
});

// Reviews ID
export const reviewIdShema = z.object({
  id: z.string().uuid("Invalid product ID format"),
});
