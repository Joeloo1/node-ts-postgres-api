import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid3 } from "../components/ProductSkeleton";
import { apiFetch } from "../lib/api";
import type { Category, Pagination, Product } from "../lib/types";
import { FilterIcon, SearchIcon, SlidersIcon, XIcon } from "../components/Icons";

type ProductsRes = {
  status: string;
  data: { products: Product[] };
  pagination: Pagination;
};

type CategoriesRes = {
  status: string;
  data: { categories: Category[] };
};

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "price:asc",      label: "Price: low → high" },
  { value: "price:desc",     label: "Price: high → low" },
  { value: "rating:desc",    label: "Top rated" },
  { value: "name:asc",       label: "Name A–Z" },
];

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const cardFade: Variants = {
  hidden: { opacity: 0, y: 16 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(() => searchParams.get("category_id") ?? "");
  const [sortKey, setSortKey] = useState(() => {
    const by = searchParams.get("sortBy") ?? "createdAt";
    const ord = searchParams.get("order") ?? "desc";
    return `${by}:${ord}`;
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [sortBy, order] = sortKey.split(":") as [string, "asc" | "desc"];

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "12");
    if (search.trim()) p.set("name", search.trim());
    if (categoryId) p.set("category_id", categoryId);
    p.set("sortBy", sortBy);
    p.set("order", order);
    return p.toString();
  }, [page, search, categoryId, sortBy, order]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiFetch<CategoriesRes>("/api/v1/categories");
      return res.data.categories;
    },
  });

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["products", queryString],
    queryFn: async () => {
      const res = await apiFetch<ProductsRes>(`/api/v1/products?${queryString}`);
      return res;
    },
  });

  function clearFilters() {
    setName("");
    setSearch("");
    setCategoryId("");
    setPage(1);
  }

  const hasActiveFilters = Boolean(search || categoryId);
  const activeFilterCount = [search, categoryId].filter(Boolean).length;
  const selectedCategoryName = categoryId
    ? categories?.find((c) => String(c.category_id) === categoryId)?.name
    : null;

  const inputClass =
    "w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30";

  return (
    <div>
      {/* ── Page header ─────────────────────────── */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Catalog</p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">Shop</h1>
        </div>
        <div className="flex items-center gap-3">
          {data?.pagination && (
            <p className="text-sm text-zinc-500">{data.pagination.total} product{data.pagination.total !== 1 ? "s" : ""}</p>
          )}
          {/* Mobile filter toggle */}
          <button
            type="button"
            onClick={() => setSidebarOpen((x) => !x)}
            className="flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/40 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white lg:hidden"
          >
            <SlidersIcon className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex gap-8">
        {/* ── Sidebar ─────────────────────────────── */}
        <aside
          className={`${
            sidebarOpen ? "block" : "hidden"
          } lg:block w-full lg:w-56 xl:w-60 shrink-0`}
        >
          <div className="sticky top-24 space-y-7">

            {/* Search */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-zinc-400">Search</p>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { setSearch(name); setPage(1); }
                  }}
                  className={`${inputClass} pl-9`}
                  placeholder="Search products…"
                />
              </div>
              {name !== search && name && (
                <button
                  type="button"
                  onClick={() => { setSearch(name); setPage(1); }}
                  className="mt-2 w-full rounded-xl bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Search
                </button>
              )}
            </div>

            {/* Sort */}
            <div>
              <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-zinc-400">Sort by</p>
              <div className="space-y-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setSortKey(opt.value); setPage(1); }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      sortKey === opt.value
                        ? "bg-emerald-600/20 text-emerald-400 font-medium"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full shrink-0 ${sortKey === opt.value ? "bg-emerald-400" : "bg-zinc-700"}`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            {categories && categories.length > 0 && (
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-widest text-zinc-400">Category</p>
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => { setCategoryId(""); setPage(1); }}
                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                      !categoryId
                        ? "bg-emerald-600/20 text-emerald-400 font-medium"
                        : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                    }`}
                  >
                    <span className={`size-1.5 rounded-full shrink-0 ${!categoryId ? "bg-emerald-400" : "bg-zinc-700"}`} />
                    All categories
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.category_id}
                      type="button"
                      onClick={() => { setCategoryId(String(c.category_id)); setPage(1); }}
                      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        categoryId === String(c.category_id)
                          ? "bg-emerald-600/20 text-emerald-400 font-medium"
                          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full shrink-0 ${categoryId === String(c.category_id) ? "bg-emerald-400" : "bg-zinc-700"}`} />
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700/80 px-4 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
              >
                <XIcon className="size-4" />
                Clear filters
              </button>
            )}
          </div>
        </aside>

        {/* ── Main content ────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              {search && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                  &quot;{search}&quot;
                  <button type="button" onClick={() => { setName(""); setSearch(""); setPage(1); }} className="text-zinc-500 hover:text-white" aria-label="Remove search">
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {categoryId && selectedCategoryName && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                  {selectedCategoryName}
                  <button type="button" onClick={() => { setCategoryId(""); setPage(1); }} className="text-zinc-500 hover:text-white" aria-label="Remove category">
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Grid / states */}
          {isPending ? (
            <ProductSkeletonGrid3 count={12} />
          ) : isError ? (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center">
              <p className="text-sm text-red-300">{(error as Error).message}</p>
            </div>
          ) : data?.data.products.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 py-24 text-center">
              <FilterIcon className="mx-auto size-12 text-zinc-700" />
              <p className="mt-4 font-semibold text-zinc-400">No products found</p>
              <p className="mt-1 text-sm text-zinc-600">Try adjusting your filters</p>
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:bg-zinc-700"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <motion.div
                key={queryString}
                className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                {data?.data.products.map((p) => (
                  <motion.div key={p.product_id} variants={cardFade}>
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <nav className="flex flex-wrap items-center justify-center gap-2 pt-6" aria-label="Pagination">
                  <button
                    type="button"
                    disabled={!data.pagination.hasPrev}
                    onClick={() => setPage((x) => Math.max(1, x - 1))}
                    className="rounded-xl border border-zinc-700/80 bg-zinc-900/50 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    ← Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === data.pagination.totalPages || Math.abs(p - page) <= 1)
                      .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("ellipsis");
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((item, i) =>
                        item === "ellipsis" ? (
                          <span key={`e-${i}`} className="px-2 text-sm text-zinc-600">…</span>
                        ) : (
                          <button
                            key={item}
                            type="button"
                            onClick={() => setPage(item as number)}
                            className={`size-10 rounded-xl text-sm font-medium transition-colors ${
                              item === page
                                ? "bg-emerald-600 text-white"
                                : "border border-zinc-700/80 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800"
                            }`}
                          >
                            {item}
                          </button>
                        ),
                      )}
                  </div>

                  <button
                    type="button"
                    disabled={!data.pagination.hasNext}
                    onClick={() => setPage((x) => x + 1)}
                    className="rounded-xl border border-zinc-700/80 bg-zinc-900/50 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    Next →
                  </button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
