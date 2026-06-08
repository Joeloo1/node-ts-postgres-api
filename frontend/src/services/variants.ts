import { apiFetch } from "../lib/http";
import type { ProductVariant } from "../lib/types";

type VariantsRes = { status: string; data: { variants: ProductVariant[] } };

export async function getVariants(productId: string): Promise<ProductVariant[]> {
  const res = await apiFetch<VariantsRes>(`/api/v1/products/${productId}/variants`);
  return res.data.variants;
}
