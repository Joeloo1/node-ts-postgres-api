import { z } from "zod";

const slugify = (name: string) =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const createTagSchema = z
  .object({
    name: z.string().min(1).max(100),
    slug: z.string().min(1).max(100).optional(),
  })
  .transform((data) => ({
    ...data,
    slug: data.slug ?? slugify(data.name),
  }));

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(100).optional(),
});

export const addTagsToProductSchema = z.object({
  tagIds: z.array(z.string().uuid()).min(1),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
