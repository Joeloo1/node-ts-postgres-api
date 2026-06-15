import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import * as wishlistService from "../services/wishlist";
import type { WishlistItem } from "../services/wishlist";

type WishlistCtx = {
  wishlist: Set<string>;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  clearAll: () => void;
  isLoading: boolean;
};

const WishlistContext = createContext<WishlistCtx>({
  wishlist: new Set(),
  toggle: () => {},
  has: () => false,
  clearAll: () => {},
  isLoading: false,
});

const STORAGE_KEY = "northline_wishlist";

function readStorage(): Set<string> {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? new Set<string>(JSON.parse(s)) : new Set<string>();
  } catch {
    return new Set<string>();
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const qc = useQueryClient();

  // ── Guest (localStorage) ──────────────────────────────────
  const [guest, setGuest] = useState<Set<string>>(readStorage);

  useEffect(() => {
    if (!token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...guest]));
    }
  }, [guest, token]);

  // ── Backend (authenticated) ───────────────────────────────
  const { data: backendItems, isPending } = useQuery({
    queryKey: ["wishlist"],
    queryFn: wishlistService.getWishlist,
    enabled: !!token,
    staleTime: 30_000,
  });

  const backendIds = useMemo(
    () => (backendItems ? new Set<string>(backendItems.map((i) => i.product_id)) : null),
    [backendItems],
  );

  // Active set — backend when signed in, localStorage for guests
  const wishlist = token ? (backendIds ?? new Set<string>()) : guest;

  // ── Toggle ────────────────────────────────────────────────
  const toggle = useCallback(
    (id: string) => {
      if (!token) {
        setGuest((prev) => {
          const next = new Set(prev);
          next.has(id) ? next.delete(id) : next.add(id);
          return next;
        });
        return;
      }
      const inWishlist = backendIds?.has(id) ?? false;
      // Optimistic remove (optimistic add is a no-op; a re-fetch will confirm)
      qc.setQueryData<WishlistItem[]>(["wishlist"], (old) =>
        old && inWishlist ? old.filter((it) => it.product_id !== id) : old,
      );
      const call = inWishlist
        ? wishlistService.removeFromWishlist(id)
        : wishlistService.addToWishlist(id);
      call
        .then(() => qc.invalidateQueries({ queryKey: ["wishlist"] }))
        .catch(() => qc.invalidateQueries({ queryKey: ["wishlist"] }));
    },
    [token, backendIds, qc],
  );

  // ── Clear all ─────────────────────────────────────────────
  const clearAll = useCallback(() => {
    if (!token) {
      setGuest(new Set());
      return;
    }
    qc.setQueryData<WishlistItem[]>(["wishlist"], []);
    wishlistService
      .clearWishlistAll()
      .then(() => qc.invalidateQueries({ queryKey: ["wishlist"] }))
      .catch(() => qc.invalidateQueries({ queryKey: ["wishlist"] }));
  }, [token, qc]);

  const has = useCallback((id: string) => wishlist.has(id), [wishlist]);

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        toggle,
        has,
        clearAll,
        isLoading: !!token && isPending,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
