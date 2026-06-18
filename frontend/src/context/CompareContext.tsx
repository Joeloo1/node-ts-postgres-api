import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Product } from "../lib/types";

const MAX_COMPARE = 4;

interface CompareCtx {
  items: Product[];
  add: (p: Product) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
  isFull: boolean;
}

const Ctx = createContext<CompareCtx | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);

  const add = useCallback((p: Product) => {
    setItems((prev) => {
      if (prev.some((x) => x.product_id === p.product_id)) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, p];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.product_id !== id));
  }, []);

  const has = useCallback((id: string) => items.some((p) => p.product_id === id), [items]);

  const clear = useCallback(() => setItems([]), []);

  return (
    <Ctx.Provider value={{ items, add, remove, has, clear, isFull: items.length >= MAX_COMPARE }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCompare must be inside CompareProvider");
  return ctx;
}
