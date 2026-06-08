import { apiFetch } from "../lib/http";
import type { PriceHistoryPoint } from "../lib/types";

type PriceHistoryRes = { status: string; data: { history: PriceHistoryPoint[] } };

export async function getPriceHistory(productId: string): Promise<PriceHistoryPoint[]> {
  const res = await apiFetch<PriceHistoryRes>(`/api/v1/products/${productId}/price-history`);
  return res.data.history;
}
