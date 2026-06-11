import { z } from "zod";

export const stockNotifySchema = z.object({
  email: z.string().email(),
  product_id: z.string().uuid(),
});
