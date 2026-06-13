import { apiFetch } from "../lib/http";
import type { Pagination, Product } from "../lib/types";

export interface ProductsParams {
  name?: string;
  category_id?: string;
  brand?: string;
  price_gte?: string;
  price_lte?: string;
  rating_gte?: string;
  discount_gte?: string;
  availability?: string;
  sortBy?: string;
  order?: string;
  page?: number;
  limit?: number;
}

type ProductsRes  = { status: string; data: { products: Product[] }; pagination: Pagination };
type ProductRes   = { status: string; data: { product: Product } };
type FeedRes      = { status: string; data: { products: Product[] }; pagination: { hasNextPage: boolean; nextCursor: string | null } };

export async function getProducts(params: ProductsParams = {}) {
  const qs = new URLSearchParams();
  if (params.page)       qs.set("page", String(params.page));
  if (params.limit)      qs.set("limit", String(params.limit));
  if (params.name)       qs.set("name", params.name);
  if (params.category_id) qs.set("category_id", params.category_id);
  if (params.brand)        qs.set("brand", params.brand);
  if (params.price_gte)    qs.set("price_gte", params.price_gte);
  if (params.price_lte)    qs.set("price_lte", params.price_lte);
  if (params.rating_gte)   qs.set("rating_gte", params.rating_gte);
  if (params.discount_gte) qs.set("discount_gte", params.discount_gte);
  if (params.availability) qs.set("availability", params.availability);
  if (params.sortBy)       qs.set("sortBy", params.sortBy);
  if (params.order)      qs.set("order", params.order);
  const res = await apiFetch<ProductsRes>(`/api/v1/products?${qs}`);
  return { products: res.data.products, pagination: res.pagination };
}

export async function getProduct(id: string): Promise<Product> {
  const res = await apiFetch<ProductRes>(`/api/v1/products/${id}`);
  return res.data.product;
}

export async function getSuggestions(name: string, limit = 6): Promise<Product[]> {
  const qs = new URLSearchParams({ name, limit: String(limit), sortBy: "rating", order: "desc" });
  const res = await apiFetch<ProductsRes>(`/api/v1/products?${qs}`);
  return res.data.products;
}

export async function getRelated(categoryId: number, excludeId: string, limit = 5): Promise<Product[]> {
  const qs = new URLSearchParams({ category_id: String(categoryId), limit: String(limit), sortBy: "rating", order: "desc" });
  const res = await apiFetch<ProductsRes>(`/api/v1/products?${qs}`);
  return res.data.products.filter((p) => p.product_id !== excludeId).slice(0, 4);
}

export async function getDeals(limit = 8): Promise<Product[]> {
  const qs = new URLSearchParams({ limit: "40", sortBy: "rating", order: "desc" });
  const res = await apiFetch<ProductsRes>(`/api/v1/products?${qs}`);
  return res.data.products.filter((p) => p.discount && p.discount > 0).slice(0, limit);
}

export async function getDealsAll(): Promise<Product[]> {
  const qs = new URLSearchParams({ limit: "100", sortBy: "rating", order: "desc" });
  const res = await apiFetch<ProductsRes>(`/api/v1/products?${qs}`);
  return res.data.products.filter((p) => p.discount && p.discount > 0);
}

export async function getProductsFeed(cursor?: string, limit = 12): Promise<{ products: Product[]; nextCursor: string | null }> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (cursor) qs.set("cursor", cursor);
  const res = await apiFetch<FeedRes>(`/api/v1/products/feed?${qs}`);
  return { products: res.data.products, nextCursor: res.pagination.nextCursor };
}

export async function getAvailableBrands(): Promise<string[]> {
  const qs = new URLSearchParams({ limit: "200", sortBy: "name", order: "asc" });
  const res = await apiFetch<ProductsRes>(`/api/v1/products?${qs}`);
  const seen = new Set<string>();
  for (const p of res.data.products) {
    if (p.brand) seen.add(p.brand);
  }
  return [...seen].sort();
}
