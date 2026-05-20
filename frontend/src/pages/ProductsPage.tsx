import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid3 } from "../components/ProductSkeleton";
import { apiFetch } from "../lib/api";
import type { Category, Pagination, Product } from "../lib/types";
import { FilterIcon, SearchIcon, XIcon } from "../components/Icons";

type ProductsRes = {
  status: string;
  data: { products: Product[] };
  pagination: Pagination;
};

type CategoriesRes = {
  status: string;
  data: { categories: Category[] };
};

const inputClass =
  "w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30";

const selectClass =
  "w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-3 py-2.5 text-sm text-white transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 appearance-none cursor-pointer";

export function ProductsPage() {
  const [page, setPage] = useState(1);
  const [name, setName] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

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
  const selectedCategoryName =
    categoryId
      ? categories?.find((c) => String(c.category_id) === categoryId)?.name
      : null;

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">
            Catalog
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-white">Shop</h1>
        </div>
        {data?.pagination && (
          <p className="text-sm text-zinc-500">
            {data.pagination.total} product{data.pagination.total !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Filter bar */}
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4">
        <div className="flex flex-wrap items-end gap-3">
          {/* Search */}
          <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-xs">
            <span className="font-medium text-zinc-400">Search</span>
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setSearch(name);
                    setPage(1);
                  }
                }}
                className={`${inputClass} pl-9`}
                placeholder="Search products…"
              />
            </div>
          </label>

          {/* Category */}
          <label className="flex min-w-[160px] flex-col gap-1.5 text-xs">
            <span className="font-medium text-zinc-400">Category</span>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">All categories</option>
              {categories?.map((c) => (
                <option key={c.category_id} value={String(c.category_id)}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          {/* Sort by */}
          <label className="flex min-w-[140px] flex-col gap-1.5 text-xs">
            <span className="font-medium text-zinc-400">Sort by</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={selectClass}
            >
              <option value="createdAt">Newest first</option>
              <option value="price">Price</option>
              <option value="rating">Top rated</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>

          {/* Order */}
          <label className="flex min-w-[120px] flex-col gap-1.5 text-xs">
            <span className="font-medium text-zinc-400">Order</span>
            <select
              value={order}
              onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
              className={selectClass}
            >
              <option value="desc">High → Low</option>
              <option value="asc">Low → High</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setSearch(name);
              setPage(1);
            }}
            className="self-end rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            Apply
          </button>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-800/60 pt-3">
            <span className="text-xs text-zinc-600">Active filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                &quot;{search}&quot;
                <button
                  type="button"
                  onClick={() => {
                    setName("");
                    setSearch("");
                    setPage(1);
                  }}
                  className="text-zinc-500 hover:text-white"
                  aria-label="Remove search filter"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            )}
            {categoryId && selectedCategoryName && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-300">
                {selectedCategoryName}
                <button
                  type="button"
                  onClick={() => {
                    setCategoryId("");
                    setPage(1);
                  }}
                  className="text-zinc-500 hover:text-white"
                  aria-label="Remove category filter"
                >
                  <XIcon className="size-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Grid / states */}
      {isPending ? (
        <ProductSkeletonGrid3 count={12} />
      ) : isError ? (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center">
          <p className="text-sm text-red-300">{(error as Error).message}</p>
        </div>
      ) : data?.data.products.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/70 bg-zinc-900/30 py-20 text-center">
          <FilterIcon className="mx-auto size-10 text-zinc-700" />
          <p className="mt-4 font-medium text-zinc-400">No products found</p>
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data?.data.products.map((p) => (
              <ProductCard key={p.product_id} product={p} />
            ))}
          </div>

          {/* Pagination */}
          {data?.pagination && data.pagination.totalPages > 1 && (
            <nav
              className="flex flex-wrap items-center justify-center gap-2 pt-8"
              aria-label="Pagination"
            >
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
                  .filter(
                    (p) =>
                      p === 1 ||
                      p === data.pagination.totalPages ||
                      Math.abs(p - page) <= 1,
                  )
                  .reduce<(number | "ellipsis")[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push("ellipsis");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, i) =>
                    item === "ellipsis" ? (
                      <span key={`e-${i}`} className="px-2 text-sm text-zinc-600">
                        …
                      </span>
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
  );
}
