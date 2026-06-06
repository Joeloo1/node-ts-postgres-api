import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ProductCard } from "../components/ProductCard";
import { ProductListItem } from "../components/ProductListItem";
import { FilterPanel, type FilterPanelProps } from "../components/FilterPanel";
import { usePageTitle } from "../hooks/usePageTitle";
import { ProductSkeletonGrid3 } from "../components/ProductSkeleton";
import { queryKeys } from "../lib/queryKeys";
import * as productService from "../services/products";
import * as categoryService from "../services/categories";
import { FilterIcon, GridIcon, SlidersIcon, XIcon } from "../components/Icons";

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const cardFade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] } },
};

export function ProductsPage() {
  usePageTitle("Products");
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(() => searchParams.get("category_id") ?? "");
  const [sortKey, setSortKey] = useState(() => {
    const by  = searchParams.get("sortBy") ?? "createdAt";
    const ord = searchParams.get("order") ?? "desc";
    return `${by}:${ord}`;
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(() => searchParams.get("price_gte") ?? "");
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get("price_lte") ?? "");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const resultsRef = useRef<HTMLDivElement>(null);

  const [sortBy, order] = sortKey.split(":") as [string, "asc" | "desc"];

  /* Fix #23 — scroll to results when filters change */
  function scrollToResults() {
    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  }

  const baseQueryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", "12");
    if (search.trim()) p.set("name", search.trim());
    if (categoryId) p.set("category_id", categoryId);
    if (minPrice) p.set("price_gte", minPrice);
    if (maxPrice) p.set("price_lte", maxPrice);
    p.set("sortBy", sortBy);
    p.set("order", order);
    return p.toString();
  }, [search, categoryId, minPrice, maxPrice, sortBy, order]);

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoryService.getCategories,
  });

  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.products(baseQueryString),
    queryFn: ({ pageParam }) =>
      productService.getProducts({
        page: pageParam as number,
        limit: 12,
        name: search.trim() || undefined,
        category_id: categoryId || undefined,
        price_gte: minPrice || undefined,
        price_lte: maxPrice || undefined,
        sortBy,
        order,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
  });

  const products = data?.pages.flatMap((p) => p.products) ?? [];
  const pagination = data?.pages[data.pages.length - 1]?.pagination;
  const totalLoaded = products.length;
  const totalAvailable = pagination?.total ?? 0;

  function clearFilters() {
    setName(""); setSearch(""); setCategoryId(""); setMinPrice(""); setMaxPrice("");
    scrollToResults();
  }

  const hasActiveFilters = Boolean(search || categoryId || minPrice || maxPrice);
  const activeFilterCount = [search, categoryId, minPrice || maxPrice].filter(Boolean).length;
  const selectedCategoryName = categoryId
    ? categories?.find((c) => String(c.category_id) === categoryId)?.name
    : null;

  const filterProps: Omit<FilterPanelProps, "onDone"> = {
    name, setName, search, setSearch,
    sortKey, setSortKey,
    categoryId, setCategoryId,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    categories, hasActiveFilters,
    activeFilterCount, clearFilters,
    setPage: () => {},
  };

  const SORT_OPTIONS = [
    { value: "createdAt:desc", label: "Newest first" },
    { value: "price:asc",      label: "Price: low → high" },
    { value: "price:desc",     label: "Price: high → low" },
    { value: "rating:desc",    label: "Top rated" },
    { value: "name:asc",       label: "Name A–Z" },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Catalog</p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
            <h1 className="font-display text-2xl font-bold text-ink sm:text-[1.85rem]">
              {selectedCategoryName ?? "All products"}
            </h1>
            {!isPending && totalAvailable > 0 && (
              <span className="rounded-full border border-stroke bg-raised px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-ink3">
                {totalAvailable.toLocaleString()} {totalAvailable === 1 ? "product" : "products"}
              </span>
            )}
            {isPending && (
              <span className="inline-block h-5 w-20 animate-shimmer rounded-full" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-0.5 rounded-lg border border-stroke bg-card p-1 lg:flex">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex size-7 items-center justify-center rounded-md transition-colors ${viewMode === "grid" ? "bg-raised text-ink shadow-sm" : "text-ink3 hover:text-ink"}`}
              aria-label="Grid view"
            >
              <GridIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex size-7 items-center justify-center rounded-md transition-colors ${viewMode === "list" ? "bg-raised text-ink shadow-sm" : "text-ink3 hover:text-ink"}`}
              aria-label="List view"
            >
              <SlidersIcon className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-stroke bg-card px-3.5 py-2 text-sm font-medium text-ink2 transition-colors hover:border-edge hover:text-ink lg:hidden"
          >
            <SlidersIcon className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex size-4.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile category scroll chips */}
      {categories && categories.length > 0 && (
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none lg:hidden">
          <button
            type="button"
            onClick={() => setCategoryId("")}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-colors ${
              !categoryId
                ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                : "border-stroke bg-card text-ink3 hover:border-edge hover:text-ink2"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.category_id}
              type="button"
              onClick={() => setCategoryId(String(c.category_id))}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-colors ${
                categoryId === String(c.category_id)
                  ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                  : "border-stroke bg-card text-ink3 hover:border-edge hover:text-ink2"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-7 xl:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 xl:w-60 shrink-0">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-stroke bg-card shadow-sm">
            <FilterPanel {...filterProps} />
          </div>
        </aside>

        <div ref={resultsRef} className="flex-1 min-w-0 space-y-4">
          {/* Sort & active filter chips */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {search && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  &ldquo;{search}&rdquo;
                  <button type="button" onClick={() => { setName(""); setSearch(""); }} className="text-emerald-500/60 hover:text-emerald-500">
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  {minPrice && maxPrice ? `$${minPrice}–$${maxPrice}` : minPrice ? `≥$${minPrice}` : `≤$${maxPrice}`}
                  <button type="button" onClick={() => { setMinPrice(""); setMaxPrice(""); }} className="text-emerald-500/60 hover:text-emerald-500">
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {!search && !minPrice && !maxPrice && (
                <p className="text-[12px] text-ink4">
                  {selectedCategoryName ?? "All products"}
                  {totalAvailable > 0 && <span className="ml-1.5 text-ink4">({totalAvailable.toLocaleString()})</span>}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={sortKey}
                  onChange={(e) => { setSortKey(e.target.value); scrollToResults(); }}
                  className="appearance-none rounded-lg border border-stroke bg-raised py-1.5 pl-3 pr-8 text-[12px] font-medium text-ink2 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer hover:border-edge transition-colors"
                >
                  {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              <div className="flex items-center gap-0.5 rounded-lg border border-stroke bg-raised p-1 lg:hidden">
                <button type="button" onClick={() => setViewMode("grid")} className={`flex size-6 items-center justify-center rounded-md transition-colors ${viewMode === "grid" ? "bg-card text-ink shadow-sm" : "text-ink4 hover:text-ink"}`}>
                  <GridIcon className="size-3.5" />
                </button>
                <button type="button" onClick={() => setViewMode("list")} className={`flex size-6 items-center justify-center rounded-md transition-colors ${viewMode === "list" ? "bg-card text-ink shadow-sm" : "text-ink4 hover:text-ink"}`}>
                  <SlidersIcon className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {isPending ? (
            <ProductSkeletonGrid3 count={12} />
          ) : isError ? (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-8 text-center">
              <p className="text-sm text-red-300">{(error as Error).message}</p>
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-28 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-raised text-ink4">
                <FilterIcon className="size-6" />
              </div>
              <p className="mt-5 font-semibold text-ink">No products found</p>
              <p className="mt-1.5 max-w-xs text-sm text-ink4">Try adjusting your search or filters to find what you're looking for.</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-lg border border-stroke bg-card px-5 py-2 text-sm font-semibold text-ink2 transition-colors hover:bg-raised hover:border-edge"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <>
              <motion.div
                key={`${baseQueryString}-${viewMode}`}
                className={viewMode === "grid" ? "grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3" : "flex flex-col gap-2.5"}
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                {products.map((p) => (
                  <motion.div key={p.product_id} variants={cardFade}>
                    {viewMode === "grid" ? <ProductCard product={p} /> : <ProductListItem product={p} />}
                  </motion.div>
                ))}
              </motion.div>

              {/* Load more */}
              {(hasNextPage || isFetchingNextPage) && (
                <div className="flex flex-col items-center gap-2 pt-8">
                  {totalAvailable > totalLoaded && (
                    <p className="text-[12px] text-ink4">
                      Showing <span className="font-semibold text-ink">{totalLoaded}</span> of {totalAvailable.toLocaleString()} products
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                    className="rounded-xl border border-stroke bg-card px-10 py-3 text-sm font-semibold text-ink2 transition-all hover:border-edge hover:bg-raised disabled:opacity-50"
                  >
                    {isFetchingNextPage ? (
                      <span className="flex items-center gap-2">
                        <svg className="size-4 animate-spin text-ink4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Loading…
                      </span>
                    ) : (
                      "Load more"
                    )}
                  </button>
                </div>
              )}

              {!hasNextPage && totalAvailable > 0 && totalLoaded >= totalAvailable && totalLoaded > 12 && (
                <p className="pt-6 text-center text-[12px] text-ink4">
                  All {totalAvailable.toLocaleString()} products loaded
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.div
              key="drawer"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-page lg:hidden"
            >
              <div className="sticky top-0 z-10 border-b border-stroke bg-page/95 px-5 pb-4 pt-3 backdrop-blur-sm">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-base font-semibold text-ink">Filters</p>
                    {activeFilterCount > 0 && (
                      <span className="flex size-4.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                        {activeFilterCount}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDrawerOpen(false)}
                    className="flex size-8 items-center justify-center rounded-lg text-ink3 transition-colors hover:bg-hover"
                  >
                    <XIcon className="size-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-stroke bg-card mx-4 my-4">
                <FilterPanel {...filterProps} onDone={() => setDrawerOpen(false)} />
              </div>

              <div className="sticky bottom-0 border-t border-stroke bg-page/95 px-5 pb-8 pt-4 backdrop-blur-sm">
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Show results
                  {totalAvailable > 0 && (
                    <span className="ml-2 text-emerald-200/80">({totalAvailable.toLocaleString()})</span>
                  )}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
