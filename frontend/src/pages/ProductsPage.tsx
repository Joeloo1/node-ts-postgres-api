import { useInfiniteQuery, useQuery, keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { ProductCard } from "../components/ProductCard";
import { ProductListItem } from "../components/ProductListItem";
import { FilterPanel, type FilterPanelProps } from "../components/FilterPanel";
import { usePageTitle } from "../hooks/usePageTitle";
import { ProductSkeletonGrid3 } from "../components/ProductSkeleton";
import { queryKeys } from "../lib/queryKeys";
import * as productService from "../services/products";
import * as categoryService from "../services/categories";
import { FilterIcon, GridIcon, ListIcon, SearchIcon, SlidersIcon, XIcon, ArrowRightIcon, StarIcon } from "../components/Icons";

/* ── Animation presets ─────────────────────────────────────── */
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.035 } } };
const cardFade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] } },
};

/* ── Sort preference persistence ──────────────────────────── */
const SORT_STORAGE_KEY = "shop:sort";

/* ── "New" badge threshold ─────────────────────────────────── */
const NEW_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
function isNewProduct(createdAt?: string) {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() < NEW_THRESHOLD_MS;
}

/* ── Category meta ─────────────────────────────────────────── */
const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; glow: string; textClass: string; iconBgClass: string; desc: string }> = {
  "Electronics":        { from: "#0f2340", to: "#1a3a6b", glow: "#2563eb", textClass: "text-blue-200",    iconBgClass: "bg-blue-500/20",    desc: "Cutting-edge tech, from audio to computing." },
  "Home & Kitchen":     { from: "#240d40", to: "#3b1f6b", glow: "#7c3aed", textClass: "text-violet-200",  iconBgClass: "bg-violet-500/20",  desc: "Everything to make your home a sanctuary." },
  "Fashion":            { from: "#3d0d24", to: "#6b1f3a", glow: "#e11d48", textClass: "text-rose-200",    iconBgClass: "bg-rose-500/20",    desc: "On-trend styles for every occasion." },
  "Sports & Outdoors":  { from: "#062819", to: "#0f4028", glow: "#059669", textClass: "text-emerald-200", iconBgClass: "bg-emerald-500/20", desc: "Gear up for your next adventure." },
  "Beauty":             { from: "#3d1a0a", to: "#6b2d12", glow: "#ea580c", textClass: "text-orange-200",  iconBgClass: "bg-orange-500/20",  desc: "Skincare, makeup, and wellness essentials." },
  "Books & Media":      { from: "#0a2030", to: "#0f3050", glow: "#0284c7", textClass: "text-sky-200",     iconBgClass: "bg-sky-500/20",     desc: "Books, music, and digital media." },
  "Toys & Games":       { from: "#281a05", to: "#4a2e08", glow: "#d97706", textClass: "text-amber-200",   iconBgClass: "bg-amber-500/20",   desc: "Fun for all ages, all year round." },
  "Garden & Tools":     { from: "#0a2810", to: "#0f4018", glow: "#16a34a", textClass: "text-lime-200",    iconBgClass: "bg-lime-500/20",    desc: "Tools and plants for outdoor living." },
  "Office":             { from: "#0a1828", to: "#0f2a44", glow: "#0ea5e9", textClass: "text-sky-200",     iconBgClass: "bg-sky-500/20",     desc: "Productivity tools for the modern workspace." },
  "Groceries & Pantry": { from: "#281a05", to: "#403010", glow: "#ca8a04", textClass: "text-yellow-200",  iconBgClass: "bg-yellow-500/20",  desc: "Quality pantry staples and fresh favourites." },
};
const CATEGORY_FALLBACK = { from: "#0d0d1a", to: "#1a1a2e", glow: "#6366f1", textClass: "text-white/80", iconBgClass: "bg-white/10", desc: "Discover our full range of products." };

function CategoryIcon({ name, className = "size-5" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    "Electronics":        "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    "Home & Kitchen":     "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75",
    "Fashion":            "M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007z",
    "Sports & Outdoors":  "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z",
    "Beauty":             "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
    "Books & Media":      "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
    "Toys & Games":       "M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z",
    "Garden & Tools":     "M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18",
    "Office":             "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0",
    "Groceries & Pantry": "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
  };
  const fallback = "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z";
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name] ?? fallback} />
    </svg>
  );
}

/* ── Sort options ──────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "price:asc",      label: "Price: low → high" },
  { value: "price:desc",     label: "Price: high → low" },
  { value: "rating:desc",    label: "Top rated" },
  { value: "name:asc",       label: "Name A–Z" },
];

const QUICK_SORTS = [
  { label: "All",       sort: "createdAt:desc" },
  { label: "Newest",    sort: "createdAt:desc" },
  { label: "Top rated", sort: "rating:desc" },
  { label: "Price ↑",  sort: "price:asc" },
  { label: "Price ↓",  sort: "price:desc" },
];

/* ══════════════════════════════════════════════════════════════ */
export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [name, setName]           = useState("");
  const [search, setSearch]       = useState(() => searchParams.get("q") ?? "");
  const [categoryId, setCategoryId] = useState(() => searchParams.get("category_id") ?? "");
  const [sortKey, setSortKey]     = useState(() => {
    const urlBy  = searchParams.get("sortBy");
    const urlOrd = searchParams.get("order");
    if (urlBy) return `${urlBy}:${urlOrd ?? "desc"}`;
    return localStorage.getItem(SORT_STORAGE_KEY) ?? "createdAt:desc";
  });
  const [minPrice, setMinPrice]   = useState(() => searchParams.get("price_gte") ?? "");
  const [maxPrice, setMaxPrice]   = useState(() => searchParams.get("price_lte") ?? "");
  const [minRating, setMinRating] = useState(() => searchParams.get("rating_gte") ?? "");
  const [inStockOnly, setInStockOnly] = useState(() => searchParams.get("in_stock") === "true");
  const [onSaleOnly, setOnSaleOnly]   = useState(() => searchParams.get("on_sale") === "true");
  const [viewMode, setViewMode]   = useState<"grid" | "list">("grid");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const resultsRef       = useRef<HTMLDivElement>(null);
  const sentinelRef      = useRef<HTMLDivElement>(null);
  const scrollRestoredRef = useRef(false);

  const [sortBy, order] = sortKey.split(":") as [string, "asc" | "desc"];

  /* ── Sync filters → URL (replace so back-button isn't spammy) ── */
  const syncUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (search)      p.set("q", search);
    if (categoryId)  p.set("category_id", categoryId);
    if (minPrice)    p.set("price_gte", minPrice);
    if (maxPrice)    p.set("price_lte", maxPrice);
    if (minRating)   p.set("rating_gte", minRating);
    if (inStockOnly) p.set("in_stock", "true");
    if (onSaleOnly)  p.set("on_sale", "true");
    if (sortBy !== "createdAt" || order !== "desc") {
      p.set("sortBy", sortBy);
      p.set("order", order);
    }
    navigate({ search: p.toString() }, { replace: true });
  }, [search, categoryId, minPrice, maxPrice, minRating, inStockOnly, onSaleOnly, sortBy, order, navigate]);

  useEffect(() => { syncUrl(); }, [syncUrl]);

  /* Persist last-used sort to localStorage */
  useEffect(() => { localStorage.setItem(SORT_STORAGE_KEY, sortKey); }, [sortKey]);

  const baseQueryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("limit", "12");
    if (search.trim()) p.set("name", search.trim());
    if (categoryId)    p.set("category_id", categoryId);
    if (minPrice)      p.set("price_gte", minPrice);
    if (maxPrice)      p.set("price_lte", maxPrice);
    if (minRating)     p.set("rating_gte", minRating);
    if (inStockOnly)   p.set("availability", "true");
    if (onSaleOnly)    p.set("discount_gte", "1");
    p.set("sortBy", sortBy);
    p.set("order", order);
    return p.toString();
  }, [search, categoryId, minPrice, maxPrice, minRating, inStockOnly, onSaleOnly, sortBy, order]);

  /* Scroll restoration — reset flag whenever query changes */
  useEffect(() => { scrollRestoredRef.current = false; }, [baseQueryString]);

  /* Save scroll position per query string */
  useEffect(() => {
    const key = `shop:scroll:${baseQueryString}`;
    const save = () => sessionStorage.setItem(key, String(Math.round(window.scrollY)));
    window.addEventListener("scroll", save, { passive: true });
    return () => window.removeEventListener("scroll", save);
  }, [baseQueryString]);

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoryService.getCategories,
  });

  const {
    data, isPending, isError, error, isFetching, isPlaceholderData, refetch,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: queryKeys.products(baseQueryString),
    queryFn: ({ pageParam }) =>
      productService.getProducts({
        page: pageParam as number, limit: 12,
        name: search.trim() || undefined,
        category_id: categoryId || undefined,
        price_gte: minPrice || undefined,
        price_lte: maxPrice || undefined,
        rating_gte: minRating || undefined,
        availability: inStockOnly ? "true" : undefined,
        discount_gte: onSaleOnly ? "1" : undefined,
        sortBy, order,
      }),
    initialPageParam: 1,
    getNextPageParam: (last) => last.pagination.hasNext ? last.pagination.page + 1 : undefined,
    placeholderData: keepPreviousData,
  });

  /* Restore scroll once first page of data arrives */
  useEffect(() => {
    if (!data || scrollRestoredRef.current || isPlaceholderData) return;
    scrollRestoredRef.current = true;
    const saved = sessionStorage.getItem(`shop:scroll:${baseQueryString}`);
    if (saved) requestAnimationFrame(() => window.scrollTo({ top: parseInt(saved, 10) }));
  }, [data, isPlaceholderData, baseQueryString]);

  /* Auto-load on scroll */
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasNextPage || isFetchingNextPage) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) fetchNextPage(); },
      { threshold: 0.1, rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const products       = data?.pages.flatMap((p) => p.products) ?? [];
  const pagination     = data?.pages[data.pages.length - 1]?.pagination;
  const totalLoaded    = products.length;
  const totalAvailable = pagination?.total ?? 0;
  const progressPct    = totalAvailable > 0 ? Math.round((totalLoaded / totalAvailable) * 100) : 0;

  const hasActiveFilters  = Boolean(search || categoryId || minPrice || maxPrice || minRating || inStockOnly || onSaleOnly);
  const activeFilterCount = [search, categoryId, minPrice || maxPrice, minRating, inStockOnly, onSaleOnly].filter(Boolean).length;

  const selectedCategory = categoryId
    ? categories?.find((c) => String(c.category_id) === categoryId)
    : null;
  const selectedCategoryName = selectedCategory?.name ?? null;
  const catMeta = selectedCategoryName
    ? (CATEGORY_GRADIENTS[selectedCategoryName] ?? CATEGORY_FALLBACK)
    : null;

  usePageTitle(
    search ? `"${search}"` : selectedCategoryName ?? "Shop"
  );

  function clearFilters() {
    setName(""); setSearch(""); setCategoryId("");
    setMinPrice(""); setMaxPrice("");
    setMinRating(""); setInStockOnly(false); setOnSaleOnly(false);
    resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const filterProps: Omit<FilterPanelProps, "onDone"> = {
    name, setName, search, setSearch,
    sortKey, setSortKey,
    categoryId, setCategoryId,
    minPrice, setMinPrice,
    maxPrice, setMaxPrice,
    minRating, setMinRating,
    inStockOnly, setInStockOnly,
    onSaleOnly, setOnSaleOnly,
    categories, hasActiveFilters,
    activeFilterCount, clearFilters,
    setPage: () => {},
  };

  return (
    <div className="space-y-0">

      {/* ══ PAGE HEADER ══════════════════════════════════════ */}
      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2 text-[11px] text-ink4">
          <span>Home</span>
          <svg className="size-3 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className={selectedCategoryName ? "text-ink3" : "text-ink font-medium"}>Shop</span>
          {selectedCategoryName && (
            <>
              <svg className="size-3 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <span className="font-medium text-ink">{selectedCategoryName}</span>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-2xl font-bold text-ink sm:text-[1.9rem]">
            {search
              ? <>Results for <span className="text-emerald-600 dark:text-emerald-400">"{search}"</span></>
              : selectedCategoryName ?? "All products"
            }
          </h1>
          {!isPending && totalAvailable > 0 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-full border border-stroke bg-raised px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-ink3"
            >
              {totalAvailable.toLocaleString()} {totalAvailable === 1 ? "product" : "products"}
            </motion.span>
          )}
          {isPending && <span className="inline-block h-5 w-20 animate-shimmer rounded-full bg-raised" />}
        </div>
      </div>

      {/* ══ CATEGORY HERO BANNER ═════════════════════════════ */}
      <AnimatePresence>
        {catMeta && selectedCategoryName && (
          <motion.div
            key={selectedCategoryName}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-6 overflow-hidden rounded-2xl"
            style={{ background: `linear-gradient(135deg, ${catMeta.from}, ${catMeta.to})` }}
          >
            <div className="relative flex items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className={`flex size-12 items-center justify-center rounded-xl ${catMeta.iconBgClass}`}>
                  <CategoryIcon name={selectedCategoryName} className={`size-6 ${catMeta.textClass}`} />
                </div>
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.2em] opacity-50 ${catMeta.textClass}`}>Category</p>
                  <h2 className={`mt-0.5 text-xl font-bold ${catMeta.textClass}`}>{selectedCategoryName}</h2>
                  <p className={`mt-0.5 text-[13px] opacity-60 hidden sm:block ${catMeta.textClass}`}>{catMeta.desc}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCategoryId("")}
                className={`hidden sm:flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/8 px-3 py-1.5 text-[12px] font-medium backdrop-blur-sm transition-colors hover:bg-white/15 ${catMeta.textClass} opacity-70 hover:opacity-100`}
              >
                <XIcon className="size-3" /> Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ MOBILE SEARCH BAR ════════════════════════════════ */}
      <div className="mb-4 lg:hidden">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink4" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSearch(name);
              if (e.key === "Escape") { setName(""); setSearch(""); }
            }}
            placeholder="Search products…"
            autoComplete="off"
            className="w-full rounded-xl border border-stroke bg-card py-2.5 pl-10 pr-10 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/25"
          />
          {name && (
            <button
              type="button"
              onClick={() => { setName(""); setSearch(""); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 transition-colors hover:text-ink2"
              aria-label="Clear search"
            >
              <XIcon className="size-4" />
            </button>
          )}
        </div>
        <AnimatePresence>
          {name.trim() && name !== search && (
            <motion.button
              key="mobile-search-apply"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              type="button"
              onClick={() => setSearch(name)}
              className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Search "{name}"
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ══ MOBILE CATEGORY CHIPS ════════════════════════════ */}
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

      {/* ══ MAIN LAYOUT ══════════════════════════════════════ */}
      <div className="flex gap-7 xl:gap-8">

        {/* ── Desktop sidebar ── */}
        <aside className="hidden lg:block w-56 xl:w-64 shrink-0">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-stroke bg-card shadow-sm">
            <FilterPanel {...filterProps} />
          </div>
        </aside>

        {/* ── Product area ── */}
        <div ref={resultsRef} className="flex-1 min-w-0 space-y-4">

          {/* Screen-reader live region for result count */}
          <span aria-live="polite" aria-atomic="true" className="sr-only">
            {!isPending && (totalAvailable > 0
              ? `${totalAvailable} ${totalAvailable === 1 ? "product" : "products"} found`
              : "No products found")}
          </span>

          {/* Thin refetch indicator bar */}
          <AnimatePresence>
            {isFetching && !isPending && !isFetchingNextPage && (
              <motion.div
                key="refetch-bar"
                initial={{ scaleX: 0, opacity: 1 }}
                animate={{ scaleX: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                style={{ originX: 0 }}
                className="absolute left-0 right-0 top-0 h-0.5 rounded-full bg-emerald-500 z-20"
              />
            )}
          </AnimatePresence>

          {/* ── Quick sort pills ── */}
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_SORTS.map(({ label, sort }) => {
              const isAllActive = label === "All" && !hasActiveFilters;
              const active = label === "All" ? isAllActive : (sortKey === sort && label !== "All");
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => {
                    setSortKey(sort);
                    if (label === "All") clearFilters();
                  }}
                  className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-all ${
                    active
                      ? "border-emerald-500/40 bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                      : "border-stroke bg-card text-ink3 hover:border-edge hover:text-ink"
                  }`}
                >
                  {label === "Top rated" && <span className="mr-1">★</span>}
                  {label}
                </button>
              );
            })}

            {/* Spacer + mobile filter + view toggle */}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-2 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[12px] font-medium text-ink2 transition-colors hover:border-edge hover:text-ink lg:hidden"
              >
                <SlidersIcon className="size-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-0.5 rounded-lg border border-stroke bg-card p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex size-7 items-center justify-center rounded-md transition-colors ${viewMode === "grid" ? "bg-raised text-ink shadow-sm" : "text-ink4 hover:text-ink"}`}
                  aria-label="Grid view"
                >
                  <GridIcon className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`flex size-7 items-center justify-center rounded-md transition-colors ${viewMode === "list" ? "bg-raised text-ink shadow-sm" : "text-ink4 hover:text-ink"}`}
                  aria-label="List view"
                >
                  <ListIcon className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Toolbar: active chips + count + sort ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stroke bg-card px-4 py-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              {search && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  "{search}"
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
              {minRating && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/8 px-2.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                  ★ {minRating}+ stars
                  <button type="button" onClick={() => setMinRating("")} className="text-amber-500/60 hover:text-amber-500">
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {inStockOnly && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                  In stock
                  <button type="button" onClick={() => setInStockOnly(false)} className="text-emerald-500/60 hover:text-emerald-500">
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {onSaleOnly && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/8 px-2.5 py-0.5 text-[11px] font-medium text-rose-700 dark:text-rose-400">
                  On sale
                  <button type="button" onClick={() => setOnSaleOnly(false)} className="text-rose-500/60 hover:text-rose-500">
                    <XIcon className="size-3" />
                  </button>
                </span>
              )}
              {hasActiveFilters && (
                <button type="button" onClick={clearFilters} className="text-[11px] font-semibold text-ink4 transition-colors hover:text-ink3">
                  Clear all
                </button>
              )}
              {!search && !minPrice && !maxPrice && !minRating && !inStockOnly && !onSaleOnly && !isPending && (
                <p className="text-[12px] text-ink4 truncate">
                  {totalLoaded > 0
                    ? `Showing ${totalLoaded.toLocaleString()} of ${totalAvailable.toLocaleString()}`
                    : "No results"}
                </p>
              )}
            </div>

            <div className="relative shrink-0">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="appearance-none rounded-lg border border-stroke bg-raised py-1.5 pl-3 pr-8 text-[12px] font-medium text-ink2 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 cursor-pointer hover:border-edge transition-colors"
              >
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>

          {/* ── Product results ── */}
          {isPending ? (
            <ProductSkeletonGrid3 count={12} />
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-900/30 bg-red-950/10 p-12 text-center">
              <svg className="size-10 text-red-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="font-semibold text-red-300">Failed to load products</p>
              <p className="text-sm text-red-400/70">{(error as Error).message}</p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-2 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Try again
              </button>
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              search={search}
              categoryName={selectedCategoryName}
              categories={categories ?? []}
              onClear={clearFilters}
              onCategory={(id) => { setCategoryId(id); setSearch(""); setName(""); }}
            />
          ) : (
            <div className={`transition-opacity duration-300 ${isPlaceholderData ? "opacity-50 pointer-events-none select-none" : "opacity-100"}`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${baseQueryString}-${viewMode}`}
                  className={viewMode === "grid" ? "grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3" : "flex flex-col gap-2.5"}
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                >
                  {products.map((p, i) => (
                    <motion.div key={p.product_id} variants={cardFade} className="relative">
                      {/* Staff pick badge */}
                      {i === 0 && sortBy === "rating" && viewMode === "grid" && (
                        <div className="absolute -left-1.5 -top-1.5 z-10 flex items-center gap-1 rounded-full bg-amber-500 pl-1.5 pr-2.5 py-0.5 text-[9px] font-bold text-white shadow-md shadow-amber-500/30">
                          <StarIcon className="size-2.5" filled /> Top rated
                        </div>
                      )}
                      {/* New badge */}
                      {isNewProduct(p.createdAt) && !(i === 0 && sortBy === "rating" && viewMode === "grid") && (
                        <div className="absolute -right-1.5 -top-1.5 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white shadow-md shadow-emerald-500/30">
                          NEW
                        </div>
                      )}
                      {viewMode === "grid" ? <ProductCard product={p} /> : <ProductListItem product={p} />}
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Progress bar */}
              {totalAvailable > 12 && (
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between text-[11px] text-ink4">
                    <span>
                      Showing <span className="font-semibold text-ink">{totalLoaded.toLocaleString()}</span> of{" "}
                      <span className="font-semibold text-ink">{totalAvailable.toLocaleString()}</span> products
                    </span>
                    <span>{progressPct}% loaded</span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-raised">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Skeleton rows when fetching next page */}
              {isFetchingNextPage && (
                <div ref={sentinelRef} className={viewMode === "grid" ? "grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3 mt-3" : "flex flex-col gap-2.5 mt-2"}>
                  {Array.from({ length: viewMode === "grid" ? 6 : 3 }).map((_, i) => (
                    viewMode === "grid" ? (
                      <div key={i} className="flex flex-col overflow-hidden rounded-xl border border-stroke bg-card">
                        <div className="aspect-[3/4] animate-shimmer" />
                        <div className="flex flex-col gap-1.5 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="h-2.5 w-14 animate-shimmer rounded" />
                            <div className="h-2.5 w-8 animate-shimmer rounded" />
                          </div>
                          <div className="h-[36px] w-full animate-shimmer rounded" />
                          <div className="mt-1 h-4 w-16 animate-shimmer rounded" />
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex gap-4 rounded-xl border border-stroke bg-card p-3">
                        <div className="h-20 w-20 shrink-0 animate-shimmer rounded-lg" />
                        <div className="flex-1 space-y-2 pt-1">
                          <div className="h-4 w-3/4 animate-shimmer rounded" />
                          <div className="h-3 w-1/4 animate-shimmer rounded" />
                          <div className="mt-2 h-8 w-28 animate-shimmer rounded-lg" />
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}

              {/* Invisible sentinel for auto-load (when not fetching) */}
              {hasNextPage && !isFetchingNextPage && (
                <div ref={sentinelRef} className="h-4" aria-hidden="true" />
              )}

              {/* All loaded */}
              {!hasNextPage && totalLoaded > 12 && (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <div className="flex size-8 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-[12px] font-medium text-ink4">All {totalAvailable.toLocaleString()} products loaded</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ MOBILE FILTER DRAWER ═════════════════════════════ */}
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
              className="fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-page lg:hidden"
            >
              <div className="sticky top-0 z-10 border-b border-stroke bg-page/95 px-5 pb-4 pt-3 backdrop-blur-sm">
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-edge" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersIcon className="size-3.5 text-ink3" />
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

/* ── Empty state ────────────────────────────────────────────── */
function EmptyState({
  search, categoryName, categories, onClear, onCategory,
}: {
  search: string;
  categoryName: string | null;
  categories: { category_id: number; name: string }[];
  onClear: () => void;
  onCategory: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center rounded-2xl border border-stroke bg-card py-20 text-center"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-raised text-ink4">
        <FilterIcon className="size-7" />
      </div>
      <h3 className="mt-5 font-display text-lg font-bold text-ink">
        {search ? `No results for "${search}"` : categoryName ? `Nothing in ${categoryName} yet` : "No products found"}
      </h3>
      <p className="mt-2 max-w-xs text-[13px] text-ink4">
        {search
          ? "Try a different search term or browse by category below."
          : "Try adjusting your filters or explore another category."}
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        Clear filters <ArrowRightIcon className="size-4" />
      </button>

      {categories.length > 0 && (
        <div className="mt-10 border-t border-stroke pt-8 w-full px-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4 mb-4">Browse categories</p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.slice(0, 8).map((c) => (
              <button
                key={c.category_id}
                type="button"
                onClick={() => onCategory(String(c.category_id))}
                className="rounded-full border border-stroke bg-raised px-3.5 py-1.5 text-[12px] font-medium text-ink3 transition-all hover:border-edge hover:bg-card hover:text-ink"
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
