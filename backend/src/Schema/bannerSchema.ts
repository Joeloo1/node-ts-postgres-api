import { z } from "zod";

export const createBannerSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(400).optional(),
  imageUrl: z.string().url(),
  linkUrl: z.string().url().optional(),
  position: z.enum(["HOME_HERO", "DEALS_PAGE", "CATEGORY_PAGE", "SIDEBAR"]),
  active: z.boolean().default(true),
  order: z.number().int().default(0),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export const updateBannerSchema = createBannerSchema.partial();

export type CreateBannerInput = z.infer<typeof createBannerSchema>;
