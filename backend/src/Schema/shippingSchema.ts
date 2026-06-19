import { z } from "zod";

export const shippingRateRequestSchema = z.object({
  country: z.string().length(2, "Use ISO-3166 2-letter country code"),
  zip: z.string().optional(),
  cartTotal: z.number().positive(),
});

export const createZoneSchema = z.object({
  name: z.string().min(1).max(100),
  countries: z.array(z.string().length(2)).min(1),
  flatRate: z.number().min(0),
  freeThreshold: z.number().positive().optional(),
  active: z.boolean().default(true),
});

export const updateZoneSchema = createZoneSchema.partial();

export const shipOrderSchema = z.object({
  rateId: z.string().optional(),
  trackingNumber: z.string().optional(),
  labelUrl: z.string().url().optional(),
});

export type ShippingRateRequest = z.infer<typeof shippingRateRequestSchema>;
export type CreateZoneInput = z.infer<typeof createZoneSchema>;
