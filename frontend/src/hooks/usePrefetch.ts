import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { queryKeys } from "../lib/queryKeys";
import { apiFetch } from "../lib/api";
import type { Product } from "../lib/types";

export function usePrefetch() {
  const qc = useQueryClient();

  const prefetchProduct = useCallback(
    (productId: string) => {
      void qc.prefetchQuery({
        queryKey: queryKeys.product(productId),
        queryFn: async () => {
          const res = await apiFetch<{ status: string; data: { product: Product } }>(
            `/api/v1/products/${productId}`,
          );
          return res.data.product;
        },
        staleTime: 5 * 60_000,
      });
    },
    [qc],
  );

  const prefetchProducts = useCallback(
    (qs?: string) => {
      void qc.prefetchQuery({
        queryKey: queryKeys.products(qs),
        queryFn: async () => {
          const res = await apiFetch<{ status: string; data: { products: Product[]; pagination: unknown } }>(
            `/api/v1/products${qs ? `?${qs}` : ""}`,
          );
          return res.data;
        },
        staleTime: 60_000,
      });
    },
    [qc],
  );

  return { prefetchProduct, prefetchProducts };
}
