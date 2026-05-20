import { createContext, useCallback, useContext, useEffect, useState } from "react";

type WishlistCtx = {
  wishlist: Set<string>;
  toggle: (id: string) => void;
  has: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistCtx>({
  wishlist: new Set(),
  toggle: () => {},
  has: () => false,
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("northline_wishlist");
      return stored ? new Set<string>(JSON.parse(stored)) : new Set<string>();
    } catch {
      return new Set<string>();
    }
  });

  useEffect(() => {
    localStorage.setItem("northline_wishlist", JSON.stringify([...wishlist]));
  }, [wishlist]);

  const toggle = useCallback((id: string) => {
    setWishlist((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const has = useCallback((id: string) => wishlist.has(id), [wishlist]);

  return (
    <WishlistContext.Provider value={{ wishlist, toggle, has }}>
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
