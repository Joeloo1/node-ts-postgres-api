import { apiFetch } from "../lib/http";
import type { Category } from "../lib/types";

type CategoriesRes = { status: string; data: { categories: Category[] } };

export async function getCategories(): Promise<Category[]> {
  const res = await apiFetch<CategoriesRes>("/api/v1/categories");
  return res.data.categories;
}
