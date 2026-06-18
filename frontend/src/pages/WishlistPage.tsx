import { useQueries } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, type Variants } from "framer-motion";
import { useWishlist } from "../context/WishlistContext";
import { ConfirmButton } from "../components/ConfirmButton";
import { usePageTitle } from "../hooks/usePageTitle";
import { queryKeys } from "../lib/queryKeys";
import * as productService from "../services/products";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeleton } from "../components/ProductSkeleton";
import { HeartIcon } from "../components/Icons";
import { BackInStockNotify } from "../components/BackInStockNotify";
import type { Product } from "../lib/types";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, ease: [0.25, 0.1, 0.25, 1] } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

type SortKey = "default" | "price-asc" | "price-desc" | "rating";

export function WishlistPage() {
  usePageTitle("Wishlist");
  const { wishlist, clearAll } = useWishlist();
  const ids = [...wishlist];
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const productQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: queryKeys.product(id),
      queryFn: () => productService.getProduct(id),
      staleTime: 60_000,
    })),
  });

  const isLoading = productQueries.some((q) => q.isPending);
  const rawProducts = productQueries.map((q) => q.data).filter(Boolean) as Product[];

  const products = useMemo(() => {
    return [...rawProducts].sort((a, b) => {
      const aOos = a.availability === false ? 1 : 0;
      const bOos = b.availability === false ? 1 : 0;
      if (aOos !== bOos) return aOos - bOos;
      if (sortKey === "price-asc")  return a.price - b.price;
      if (sortKey === "price-desc") return b.price - a.price;
      if (sortKey === "rating")     return (b.rating ?? 0) - (a.rating ?? 0);
      return 0;
    });
  }, [rawProducts, sortKey]);

  if (ids.length === 0) {
    return (
      <>
        <Helmet>
          <title>Wishlist — Northline</title>
          <meta name="description" content="View your saved Northline items and get notified when out-of-stock products are available again." />
          <meta property="og:title" content="Wishlist — Northline" />
          <meta property="og:description" content="View your saved Northline items." />
          <meta property="og:type" content="website" />
          <meta property="og:site_name" content="Northline" />
        </Helmet>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
          <div className="flex size-24 items-center justify-center rounded-3xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-rose-500/5 text-red-400 shadow-lg shadow-red-500/10">
            <HeartIcon className="size-12" filled />
          </div>
          <div className="space-y-1.5">
            <h1 className="font-display text-xl font-bold text-ink">Your wishlist is empty</h1>
            <p className="text-sm text-ink4">Start saving items you love and come back to them anytime.</p>
            <p className="text-xs text-ink4">You'll also get notified when saved items go back in stock.</p>
          </div>
          <Link
            to="/products"
            className="relative overflow-hidden rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.97]"
          >
            <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
            Browse products
          </Link>
        </div>
      </>
    );
  }

  // Compute price total from loaded products
  const priceTotal = rawProducts.reduce((sum, p) => {
    const price = p.discount && p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;
    return sum + price;
  }, 0);

  return (
    <>
      <Helmet>
        <title>Wishlist — Northline</title>
        <meta name="description" content="View your saved Northline items and get notified when out-of-stock products are available again." />
        <meta property="og:title" content="Wishlist — Northline" />
        <meta property="og:description" content="View your saved Northline items." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>
      <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center">
            <div className="h-6 w-0.5 rounded-full bg-emerald-500 mr-3" />
            <h1 className="font-display text-3xl font-bold text-ink">Wishlist</h1>
          </div>
          {/* Stats row */}
          <div className="mt-1.5 flex items-center gap-3 text-sm text-ink4">
            <span>
              <span className="font-semibold text-ink">{ids.length}</span>{" "}
              {ids.length === 1 ? "item" : "items"} saved
            </span>
            {!isLoading && rawProducts.length > 0 && (
              <>
                <span className="text-ink4/40">·</span>
                <span>
                  Total value{" "}
                  <span className="font-semibold text-ink">${priceTotal.toFixed(2)}</span>
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sort dropdown */}
          {!isLoading && products.length > 1 && (
            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="appearance-none rounded-lg border border-stroke bg-raised py-1.5 pl-3 pr-8 text-[12px] font-medium text-ink2 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer hover:border-edge transition-colors"
              >
                <option value="default">Default order</option>
                <option value="price-asc">Price: low → high</option>
                <option value="price-desc">Price: high → low</option>
                <option value="rating">Top rated</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          )}

          <ConfirmButton
            onConfirm={clearAll}
            message="Clear all saved items?"
            confirmLabel="Yes, clear"
            className="rounded-lg border border-edge px-3 py-2 text-sm text-ink3 hover:border-edge hover:text-ink2 transition-colors"
          >
            Clear all
          </ConfirmButton>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ids.map((id) => <ProductSkeleton key={id} />)}
        </div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => {
            const oos = product.availability === false;
            return (
              <motion.div key={product.product_id} variants={item} className="relative">
                {oos && (
                  <div className="absolute left-2 top-2 z-10 rounded-full border border-stroke bg-card px-2 py-0.5 text-[10px] font-semibold text-ink4 shadow-sm">
                    Out of stock
                  </div>
                )}
                <div className={oos ? "opacity-50 pointer-events-none select-none" : ""}>
                  <ProductCard product={product} />
                </div>
                {oos && (
                  <div className="mt-2">
                    <BackInStockNotify productId={product.product_id} productName={product.name} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
    </>
  );
}
