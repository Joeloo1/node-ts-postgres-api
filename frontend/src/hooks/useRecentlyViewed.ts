import { useMemo, useEffect } from "react";
import { useQueries } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Product } from "../lib/types";
import { trackProductViewEvent } from "../services/products";

const KEY = "northline_recently_viewed";
const MAX = 8;

export function trackRecentlyViewed(productId: string) {
  try {
    const existing: string[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const updated = [productId, ...existing.filter((id) => id !== productId)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(updated));
  } catch {}
}

export function getRecentlyViewedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function useRecentlyViewed(excludeId?: string) {
  const ids = useMemo(
    () => getRecentlyViewedIds().filter((id) => id !== excludeId).slice(0, 4),
    [excludeId],
  );

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["product", id],
      queryFn: async () => {
        const res = await apiFetch<{ status: string; data: { product: Product } }>(
          `/api/v1/products/${id}`,
        );
        return res.data.product;
      },
      staleTime: 5 * 60_000,
    })),
  });

  return {
    products: queries.map((q) => q.data).filter(Boolean) as Product[],
    isLoading: queries.some((q) => q.isPending),
    hasAny: ids.length > 0,
  };
}

/**
 * Tracks a product view for logged-in users via the backend events API.
 * Also always writes to localStorage for guest tracking.
 * Fire-and-forget — no UI side effects on failure.
 */
export function useTrackProductView(productId: string | undefined, isLoggedIn: boolean) {
  useEffect(() => {
    if (!productId) return;
    // Always track in localStorage (guests + logged-in)
    trackRecentlyViewed(productId);
    // For logged-in users, also persist via backend
    if (isLoggedIn) {
      trackProductViewEvent(productId);
    }
  // Only fire once per productId mount — no dependency on isLoggedIn changing
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);
}
