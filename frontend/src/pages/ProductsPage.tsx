import { useQuery } from "@tanstack/react-query";
import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ProductCard } from "../components/ProductCard";
import { usePageTitle } from "../hooks/usePageTitle";
import { ProductSkeletonGrid3 } from "../components/ProductSkeleton";
import { apiFetch } from "../lib/api";
import type { Category, Pagination, Product } from "../lib/types";
import { FilterIcon, GridIcon, SearchIcon, SlidersIcon, StarIcon, XIcon } from "../components/Icons";
import { productImageUrl } from "../lib/productImage";
import { useDebounce } from "../hooks/useDebounce";

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
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] } },
};

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3 py-2 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/25";

/* ── Search autocomplete ─────────────────────── */
function SearchAutocomplete({
  name, setName, search, setSearch, setPage, onDone,
}: {
  name: string; setName: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  setPage: (v: number) => void; onDone?: () => void;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedName = useDebounce(name, 260);

  const { data: suggestions, isFetching } = useQuery({
    queryKey: ["search-suggestions", debouncedName],
    queryFn: async () => {
      const res = await apiFetch<{ status: string; data: { products: Product[] } }>(
        `/api/v1/products?name=${encodeURIComponent(debouncedName.trim())}&limit=6&sortBy=rating&order=desc`,
      );
      return res.data.products;
    },
    enabled: debouncedName.trim().length >= 2,
    staleTime: 30_000,
  });

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDropdown = open && name.trim().length >= 2 && (isFetching || (suggestions && suggestions.length > 0));

  function applySearch() {
    setSearch(name);
    setPage(1);
    setOpen(false);
    onDone?.();
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink4" />
        <input
          value={name}
          onChange={(e) => { setName(e.target.value); setOpen(true); }}
          onFocus={() => { if (name.trim().length >= 2) setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") applySearch();
            if (e.key === "Escape") setOpen(false);
          }}
          className={`${inputClass} pl-9 ${name ? "pr-8" : ""}`}
          placeholder="Search products…"
          autoComplete="off"
        />
        {name && (
          <button
            type="button"
            onClick={() => { setName(""); setSearch(""); setPage(1); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 transition-colors hover:text-ink2"
            aria-label="Clear search"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-stroke bg-card shadow-2xl shadow-black/20"
          >
            {isFetching && (!suggestions || suggestions.length === 0) ? (
              <div className="flex items-center gap-2 px-4 py-3 text-sm text-ink4">
                <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Searching…
              </div>
            ) : (
              <>
                {suggestions?.map((p) => {
                  const displayPrice = p.discount && p.discount > 0
                    ? p.price * (1 - p.discount / 100)
                    : p.price;
                  return (
                    <button
                      key={p.product_id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        navigate(`/products/${p.product_id}`);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-raised"
                    >
                      <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-raised">
                        <img
                          src={productImageUrl(p)}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                            ${displayPrice.toFixed(2)}
                          </span>
                          {p.rating != null && (
                            <span className="flex items-center gap-0.5 text-[11px] text-ink4">
                              <StarIcon className="size-2.5 text-amber-400" filled />
                              {p.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* "Search for X" footer */}
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); applySearch(); }}
                  className="flex w-full items-center gap-2 border-t border-stroke px-3 py-2.5 text-[12px] font-medium text-ink3 transition-colors hover:bg-raised"
                >
                  <SearchIcon className="size-3.5 shrink-0 text-ink4" />
                  Search for &ldquo;{name}&rdquo;
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply filter button */}
      <AnimatePresence>
        {name !== search && name && !open && (
          <motion.button
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            type="button"
            onClick={applySearch}
            className="mt-2.5 w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Search
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Sidebar filter panel ─────────────────────── */
function FilterPanel({
  name, setName, search, setSearch,
  sortKey, setSortKey,
  categoryId, setCategoryId,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
  categories, hasActiveFilters,
  setPage, onDone, activeFilterCount, clearFilters,
}: {
  name: string; setName: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  sortKey: string; setSortKey: (v: string) => void;
  categoryId: string; setCategoryId: (v: string) => void;
  minPrice: string; setMinPrice: (v: string) => void;
  maxPrice: string; setMaxPrice: (v: string) => void;
  categories: Category[] | undefined;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  setPage: (v: number) => void;
  clearFilters: () => void;
  onDone?: () => void;
}) {
  return (
    <div>
      {/* ── Panel header ── */}
      <div className="flex items-center justify-between border-b border-stroke px-4 py-3.5">
        <div className="flex items-center gap-2">
          <SlidersIcon className="size-3.5 text-ink3" />
          <span className="text-sm font-semibold text-ink">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex size-4.5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-[11px] font-semibold text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
          >
            Clear all
          </button>
        )}
      </div>

      {/* ── Search ── */}
      <div className="border-b border-stroke px-4 py-4">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-ink4">Search</p>
        <SearchAutocomplete
          name={name} setName={setName}
          search={search} setSearch={setSearch}
          setPage={setPage} onDone={onDone}
        />
      </div>

      {/* ── Sort ── */}
      <div className="border-b border-stroke px-4 py-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">Sort by</p>
        <div className="space-y-px">
          {SORT_OPTIONS.map((opt) => {
            const active = sortKey === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setSortKey(opt.value); setPage(1); }}
                className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-all ${
                  active ? "text-ink" : "text-ink3 hover:text-ink2"
                }`}
              >
                {/* Radio indicator */}
                <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  active
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-edge group-hover:border-ink3"
                }`}>
                  {active && <span className="size-1.5 rounded-full bg-white" />}
                </span>
                <span className={active ? "font-medium" : ""}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Price range ── */}
      <div className="border-b border-stroke px-4 py-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">Price range</p>

        {/* Quick presets */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {([["", "25"], ["25", "75"], ["75", "150"], ["150", ""]] as const).map(([min, max]) => {
            const label = !min ? `Under $${max}` : !max ? `$${min}+` : `$${min}–$${max}`;
            const isActive = minPrice === min && maxPrice === max;
            return (
              <button
                key={label}
                type="button"
                onClick={() => { setMinPrice(min); setMaxPrice(max); setPage(1); }}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  isActive
                    ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                    : "border-stroke bg-raised text-ink3 hover:border-edge hover:text-ink2"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Manual inputs */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink4">$</span>
            <input
              type="number" min={0}
              value={minPrice}
              onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
              placeholder="Min"
              className={`${inputClass} pl-5 text-[13px]`}
            />
          </div>
          <div className="h-px w-3 shrink-0 bg-edge" />
          <div className="relative flex-1">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-ink4">$</span>
            <input
              type="number" min={0}
              value={maxPrice}
              onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
              placeholder="Max"
              className={`${inputClass} pl-5 text-[13px]`}
            />
          </div>
        </div>
      </div>

      {/* ── Category ── */}
      {categories && categories.length > 0 && (
        <div className="px-4 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">Category</p>
          <div className="space-y-px">
            {[{ id: "", name: "All categories" }, ...categories.map((c) => ({ id: String(c.category_id), name: c.name }))].map(({ id, name: catName }) => {
              const active = categoryId === id;
              return (
                <button
                  key={id || "all"}
                  type="button"
                  onClick={() => { setCategoryId(id); setPage(1); }}
                  className={`group relative flex w-full items-center gap-2.5 rounded-lg py-2 pl-3 pr-3 text-[13px] transition-all ${
                    active ? "text-ink" : "text-ink3 hover:text-ink2"
                  }`}
                >
                  {/* Left accent bar */}
                  <span className={`absolute left-0 top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full transition-all ${
                    active ? "bg-emerald-500 opacity-100" : "bg-transparent opacity-0"
                  }`} />
                  <span className={active ? "font-medium" : ""}>{catName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── List view row ────────────────────────────── */
function ProductListItem({ product }: { product: Product }) {
  const displayPrice = product.discount && product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price;
  const hasDiscount = product.discount && product.discount > 0;
  const categoryName = product.category && "name" in product.category ? product.category.name : null;

  return (
    <Link
      to={`/products/${product.product_id}`}
      className="group flex items-center gap-4 rounded-2xl border border-stroke bg-card px-4 py-3.5 transition-all duration-200 hover:border-edge hover:bg-raised hover:shadow-lg hover:shadow-black/8"
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-raised sm:size-[72px]">
        <img
          src={productImageUrl(product)}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
          loading="lazy"
        />
        {hasDiscount && (
          <span className="absolute left-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            −{Math.round(product.discount!)}%
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink4">{categoryName ?? product.brand ?? ""}</p>
        <p className="mt-0.5 text-sm font-semibold text-ink line-clamp-1 transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
          {product.name}
        </p>
        {product.description && (
          <p className="mt-0.5 text-xs text-ink4 line-clamp-1 hidden sm:block">{product.description}</p>
        )}
        {!product.availability && (
          <span className="mt-1 inline-block text-[11px] font-medium text-red-400">Out of stock</span>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums text-ink">${displayPrice.toFixed(2)}</p>
        {hasDiscount && <p className="text-[11px] tabular-nums text-ink4 line-through">${product.price.toFixed(2)}</p>}
        {product.rating != null && <p className="mt-0.5 text-[11px] font-medium text-amber-500">★ {product.rating.toFixed(1)}</p>}
      </div>
      <svg className="size-4 shrink-0 text-ink4 transition-all group-hover:translate-x-0.5 group-hover:text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}

/* ═════════════════════════════════════════════ */
export function ProductsPage() {
  usePageTitle("Products");
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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [minPrice, setMinPrice] = useState(() => searchParams.get("price_gte") ?? "");
  const [maxPrice, setMaxPrice] = useState(() => searchParams.get("price_lte") ?? "");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [sortBy, order] = sortKey.split(":") as [string, "asc" | "desc"];

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("page", String(page));
    p.set("limit", "12");
    if (search.trim()) p.set("name", search.trim());
    if (categoryId) p.set("category_id", categoryId);
    if (minPrice) p.set("price_gte", minPrice);
    if (maxPrice) p.set("price_lte", maxPrice);
    p.set("sortBy", sortBy);
    p.set("order", order);
    return p.toString();
  }, [page, search, categoryId, minPrice, maxPrice, sortBy, order]);

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
    setName(""); setSearch(""); setCategoryId(""); setMinPrice(""); setMaxPrice(""); setPage(1);
  }

  const hasActiveFilters = Boolean(search || categoryId || minPrice || maxPrice);
  const activeFilterCount = [search, categoryId, minPrice || maxPrice].filter(Boolean).length;
  const selectedCategoryName = categoryId
    ? categories?.find((c) => String(c.category_id) === categoryId)?.name
    : null;
  const filterProps = {
    name, setName, search, setSearch,
    sortKey, setSortKey,
    categoryId, setCategoryId,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    categories, hasActiveFilters,
    activeFilterCount, clearFilters,
    setPage,
  };

  return (
    <div>
      {/* ── Page header ───────────────────────── */}
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Catalog
          </p>
          <h1 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-[1.85rem]">
            {selectedCategoryName ?? "All products"}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* View toggle — desktop */}
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

          {/* Mobile filter button */}
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

      {/* ── Mobile category scroll chips ────────── */}
      {categories && categories.length > 0 && (
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none lg:hidden">
          <button
            type="button"
            onClick={() => { setCategoryId(""); setPage(1); }}
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
              onClick={() => { setCategoryId(String(c.category_id)); setPage(1); }}
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

        {/* ── Desktop sidebar ─────────────────── */}
        <aside className="hidden lg:block w-56 xl:w-60 shrink-0">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-stroke bg-card shadow-sm">
            <FilterPanel {...filterProps} />
          </div>
        </aside>

        {/* ── Main content ────────────────────── */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Sort & filter chip bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke bg-card px-4 py-3">
            {/* Active filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              {search && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  &ldquo;{search}&rdquo;
                  <button type="button" onClick={() => { setName(""); setSearch(""); setPage(1); }} className="text-emerald-500/60 hover:text-emerald-500">
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {(minPrice || maxPrice) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  {minPrice && maxPrice ? `$${minPrice}–$${maxPrice}` : minPrice ? `≥$${minPrice}` : `≤$${maxPrice}`}
                  <button type="button" onClick={() => { setMinPrice(""); setMaxPrice(""); setPage(1); }} className="text-emerald-500/60 hover:text-emerald-500">
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {!search && !minPrice && !maxPrice && (
                <p className="text-[12px] text-ink4">
                  {selectedCategoryName ? selectedCategoryName : "All products"}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Sort dropdown — visible everywhere */}
              <div className="relative">
                <select
                  value={sortKey}
                  onChange={(e) => { setSortKey(e.target.value); setPage(1); }}
                  className="appearance-none rounded-lg border border-stroke bg-raised py-1.5 pl-3 pr-8 text-[12px] font-medium text-ink2 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer hover:border-edge transition-colors"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </div>

              {/* View toggle on mobile */}
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

          {/* Product grid / states */}
          {isPending ? (
            <ProductSkeletonGrid3 count={12} />
          ) : isError ? (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-8 text-center">
              <p className="text-sm text-red-300">{(error as Error).message}</p>
            </div>
          ) : data?.data.products.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-28 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-raised text-ink4">
                <FilterIcon className="size-6" />
              </div>
              <p className="mt-5 font-semibold text-ink">No products found</p>
              <p className="mt-1.5 max-w-xs text-sm text-ink4">
                Try adjusting your search or filters to find what you're looking for.
              </p>
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
                key={`${queryString}-${viewMode}`}
                className={viewMode === "grid"
                  ? "grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3"
                  : "flex flex-col gap-2.5"
                }
                variants={stagger}
                initial="hidden"
                animate="show"
              >
                {data?.data.products.map((p) => (
                  <motion.div key={p.product_id} variants={cardFade}>
                    {viewMode === "grid" ? <ProductCard product={p} /> : <ProductListItem product={p} />}
                  </motion.div>
                ))}
              </motion.div>

              {/* Pagination */}
              {data?.pagination && data.pagination.totalPages > 1 && (
                <nav className="flex flex-col items-center gap-3 pt-8" aria-label="Pagination">
                  <p className="text-[12px] text-ink4">
                    Page <span className="font-semibold text-ink">{page}</span> of {data.pagination.totalPages}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={!data.pagination.hasPrev}
                      onClick={() => { setPage((x) => Math.max(1, x - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="flex items-center gap-1.5 rounded-lg border border-stroke bg-card px-3.5 py-2 text-sm font-medium text-ink2 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      ← Prev
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
                            <span key={`e-${i}`} className="px-1 text-sm text-ink4">…</span>
                          ) : (
                            <button
                              key={item}
                              type="button"
                              onClick={() => { setPage(item as number); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                              className={`size-9 rounded-lg text-sm font-semibold transition-colors ${
                                item === page
                                  ? "bg-emerald-600 text-white shadow-sm shadow-emerald-500/25"
                                  : "border border-stroke bg-card text-ink3 hover:bg-hover hover:text-ink"
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
                      onClick={() => { setPage((x) => x + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="flex items-center gap-1.5 rounded-lg border border-stroke bg-card px-3.5 py-2 text-sm font-medium text-ink2 transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Next →
                    </button>
                  </div>
                </nav>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Mobile filter drawer ─────────────── */}
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
              {/* Drawer handle + header */}
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
                  {data?.pagination && (
                    <span className="ml-2 text-emerald-200/80">({data.pagination.total.toLocaleString()})</span>
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
