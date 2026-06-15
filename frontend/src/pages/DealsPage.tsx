import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Link } from "react-router-dom";
import { ProductCard } from "../components/ProductCard";
import { ProductListItem } from "../components/ProductListItem";
import { ProductSkeletonGrid } from "../components/ProductSkeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import * as productService from "../services/products";
import { GridIcon, ListIcon, TagIcon } from "../components/Icons";
import type { Product } from "../lib/types";

type SortKey = "discount" | "price_asc" | "price_desc" | "rating";

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.035 } } };
const cardFade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] } },
};

function salePrice(p: Product) {
  return p.discount ? p.price * (1 - p.discount / 100) : p.price;
}

function sorted(deals: Product[], key: SortKey): Product[] {
  return [...deals].sort((a, b) => {
    switch (key) {
      case "discount":   return (b.discount ?? 0) - (a.discount ?? 0);
      case "price_asc":  return salePrice(a) - salePrice(b);
      case "price_desc": return salePrice(b) - salePrice(a);
      case "rating":     return (b.rating ?? 0) - (a.rating ?? 0);
    }
  });
}

export function DealsPage() {
  usePageTitle("Deals & Offers");
  const [sortKey, setSortKey]   = useState<SortKey>("discount");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const { data: raw, isPending } = useQuery({
    queryKey: ["deals-all"],
    queryFn:  productService.getDealsAll,
    staleTime: 5 * 60_000,
  });

  const deals = useMemo(() => sorted(raw ?? [], sortKey), [raw, sortKey]);
  const maxDiscount = deals.length ? Math.max(...deals.map((p) => p.discount ?? 0)) : 0;

  return (
    <div className="space-y-10">

      {/* ── Hero banner ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="-mx-4 -mt-8 overflow-hidden sm:-mx-6 lg:-mx-8"
        style={{ background: "linear-gradient(135deg, #3d0808 0%, #7f1d1d 50%, #0f172a 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-red-400" />
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-red-400">Limited time offers</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl lg:text-[2.2rem]">
              Deals &amp; Offers
            </h1>
            <p className="mt-4 max-w-lg text-[16px] leading-[1.75] text-white/60">
              {isPending
                ? "Loading deals…"
                : deals.length > 0
                  ? `${deals.length} product${deals.length === 1 ? "" : "s"} on sale — up to ${maxDiscount}% off.`
                  : "New deals are added regularly — check back soon."}
            </p>
          </div>
        </div>
      </motion.div>

      {/* ── Toolbar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink4">
          {!isPending && `${deals.length} deal${deals.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-2">
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-lg border border-stroke bg-card px-3 py-2 text-[13px] font-medium text-ink outline-none focus:border-emerald-500/40"
          >
            <option value="discount">Biggest discount</option>
            <option value="price_asc">Lowest price</option>
            <option value="price_desc">Highest price</option>
            <option value="rating">Top rated</option>
          </select>
          <button
            onClick={() => setViewMode("grid")}
            className={`flex size-9 items-center justify-center rounded-lg border transition-colors ${
              viewMode === "grid" ? "border-edge bg-raised text-ink" : "border-stroke text-ink4 hover:text-ink hover:bg-hover"
            }`}
            aria-label="Grid view"
          >
            <GridIcon className="size-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`flex size-9 items-center justify-center rounded-lg border transition-colors ${
              viewMode === "list" ? "border-edge bg-raised text-ink" : "border-stroke text-ink4 hover:text-ink hover:bg-hover"
            }`}
            aria-label="List view"
          >
            <ListIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Content ────────────────────────────────────────────── */}
      {isPending ? (
        <ProductSkeletonGrid count={8} />
      ) : deals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-raised">
            <TagIcon className="size-8 text-ink4" />
          </div>
          <p className="mt-5 text-lg font-semibold text-ink">No active deals</p>
          <p className="mt-1 text-sm text-ink4">New deals are added regularly — check back soon.</p>
          <Link
            to="/products"
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Browse all products
          </Link>
        </div>
      ) : viewMode === "grid" ? (
        <motion.div
          variants={stagger} initial="hidden" animate="show"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4"
        >
          {deals.map((p) => (
            <motion.div key={p.product_id} variants={cardFade}>
              <ProductCard product={p} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-3">
          {deals.map((p) => (
            <motion.div key={p.product_id} variants={cardFade}>
              <ProductListItem product={p} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
