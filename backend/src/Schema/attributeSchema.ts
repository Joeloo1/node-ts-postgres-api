import { z } from "zod";

export const createAttributeSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().min(1).max(200),
});

export const bulkSetAttributesSchema = z.object({
  attributes: z
    .array(
      z.object({
        key: z.string().min(1).max(100),
        value: z.string().min(1).max(200),
      }),
    )
    .min(0),
});

export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;
export type BulkSetAttributesInput = z.infer<typeof bulkSetAttributesSchema>;
