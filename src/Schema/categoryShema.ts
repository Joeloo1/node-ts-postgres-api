import { z } from "zod";

// Get category by ID
export const categoryIdSchema = z.object({
  id: z.coerce.number()
        .int()
        .positive('Category ID must be a positive integer'),
});
