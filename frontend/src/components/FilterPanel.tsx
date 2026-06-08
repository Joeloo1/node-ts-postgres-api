import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useDebounce } from "../hooks/useDebounce";
import { queryKeys } from "../lib/queryKeys";
import * as productService from "../services/products";
import { productImageUrl } from "../lib/productImage";
import { SearchIcon, SlidersIcon, XIcon } from "./Icons";
import type { Category } from "../lib/types";

/* ── Sort options ──────────────────────────────────────────── */
const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first",       icon: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" },
  { value: "price:asc",      label: "Price: low → high",  icon: "M2.25 18L9 11.25l4.5 4.5 6.75-7.5" },
  { value: "price:desc",     label: "Price: high → low",  icon: "M2.25 6L9 12.75l4.5-4.5 6.75 7.5" },
  { value: "rating:desc",    label: "Top rated",          icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
  { value: "name:asc",       label: "Name A–Z",           icon: "M3 4.5h14.25M3 9h9.75M3 13.5h5.25m5.25-.75L17.25 9m0 0L21 12.75M17.25 9v12" },
];

/* ── Price presets ─────────────────────────────────────────── */
const PRICE_PRESETS: [string, string, string][] = [
  ["Under $25",   "",    "25"],
  ["$25 – $75",   "25",  "75"],
  ["$75 – $150",  "75",  "150"],
  ["$150+",       "150", ""],
];

/* ── Category icons ────────────────────────────────────────── */
const CATEGORY_ICONS: Record<string, string> = {
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

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3 py-2 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/25";

/* ── Collapsible section wrapper ───────────────────────────── */
function FilterSection({
  title, children, defaultOpen = true, badge,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-stroke last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-hover"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-ink3">{title}</span>
          {badge != null && badge > 0 && (
            <span className="flex size-4 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`size-3.5 text-ink4 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Search with autocomplete ──────────────────────────────── */
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
  const inputRef = useRef<HTMLInputElement>(null);
  const debouncedName = useDebounce(name, 260);

  /* "/" keyboard shortcut — focus search from anywhere on the page */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/") return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const { data: suggestions, isFetching } = useQuery({
    queryKey: queryKeys.suggestions(debouncedName),
    queryFn: () => productService.getSuggestions(debouncedName.trim()),
    enabled: debouncedName.trim().length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
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
    <div ref={containerRef} className="relative px-4">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink4" />
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => { setName(e.target.value); setOpen(true); }}
          onFocus={() => { if (name.trim().length >= 2) setOpen(true); }}
          onKeyDown={(e) => {
            if (e.key === "Enter") applySearch();
            if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
          }}
          className={`${inputClass} pl-9 ${name ? "pr-8" : "pr-8"}`}
          placeholder="Search products…"
          autoComplete="off"
        />
        {/* "/" shortcut hint — hidden when typing */}
        {!name && (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 hidden select-none items-center gap-0.5 rounded border border-stroke bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink4 lg:flex">
            /
          </kbd>
        )}
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

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute left-4 right-4 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-stroke bg-card shadow-2xl shadow-black/20"
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
                        <img src={productImageUrl(p)} alt={p.name} className="h-full w-full object-cover" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                        <p className="mt-0.5 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ${displayPrice.toFixed(2)}
                        </p>
                      </div>
                    </button>
                  );
                })}
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

/* ── Rating pills ──────────────────────────────────────────── */
const RATING_OPTIONS: { label: string; value: string }[] = [
  { label: "Any",   value: "" },
  { label: "3★+",  value: "3" },
  { label: "4★+",  value: "4" },
  { label: "4.5★+", value: "4.5" },
];

/* ══ FilterPanel ══════════════════════════════════════════════ */
export interface FilterPanelProps {
  name: string; setName: (v: string) => void;
  search: string; setSearch: (v: string) => void;
  sortKey: string; setSortKey: (v: string) => void;
  categoryId: string; setCategoryId: (v: string) => void;
  minPrice: string; setMinPrice: (v: string) => void;
  maxPrice: string; setMaxPrice: (v: string) => void;
  minRating: string; setMinRating: (v: string) => void;
  inStockOnly: boolean; setInStockOnly: (v: boolean) => void;
  onSaleOnly: boolean; setOnSaleOnly: (v: boolean) => void;
  categories: Category[] | undefined;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  setPage: (v: number) => void;
  clearFilters: () => void;
  onDone?: () => void;
}

export function FilterPanel({
  name, setName, search, setSearch,
  sortKey, setSortKey,
  categoryId, setCategoryId,
  minPrice, setMinPrice, maxPrice, setMaxPrice,
  minRating, setMinRating,
  inStockOnly, setInStockOnly,
  onSaleOnly, setOnSaleOnly,
  categories, hasActiveFilters, activeFilterCount,
  clearFilters, setPage, onDone,
}: FilterPanelProps) {
  const priceActive    = Boolean(minPrice || maxPrice);
  const ratingActive   = Boolean(minRating);
  const categoryActive = Boolean(categoryId);

  return (
    <div>
      {/* Panel header */}
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
      <FilterSection title="Search" defaultOpen={true} badge={search ? 1 : 0}>
        <SearchAutocomplete
          name={name} setName={setName}
          search={search} setSearch={setSearch}
          setPage={setPage} onDone={onDone}
        />
      </FilterSection>

      {/* ── Sort ── */}
      <FilterSection title="Sort by" defaultOpen={true}>
        <div className="space-y-0.5 px-4">
          {SORT_OPTIONS.map((opt) => {
            const active = sortKey === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setSortKey(opt.value); setPage(1); }}
                className={`group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-all ${
                  active ? "bg-emerald-500/8 text-ink" : "text-ink3 hover:bg-hover hover:text-ink2"
                }`}
              >
                {/* Icon */}
                <svg className={`size-3.5 shrink-0 ${active ? "text-emerald-500" : "text-ink4"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={opt.icon} />
                </svg>
                <span className={active ? "font-semibold" : ""}>{opt.label}</span>
                {active && (
                  <svg className="ml-auto size-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* ── Price ── */}
      <FilterSection title="Price" defaultOpen={true} badge={priceActive ? 1 : 0}>
        {/* Preset pills */}
        <div className="mb-3 flex flex-wrap gap-1.5 px-4">
          {PRICE_PRESETS.map(([label, min, max]) => {
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

        {/* Custom inputs */}
        <div className="flex items-center gap-2 px-4">
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
          {priceActive && (
            <button
              type="button"
              onClick={() => { setMinPrice(""); setMaxPrice(""); setPage(1); }}
              className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-stroke text-ink4 transition-colors hover:border-edge hover:text-red-400"
              aria-label="Clear price filter"
            >
              <XIcon className="size-3" />
            </button>
          )}
        </div>
      </FilterSection>

      {/* ── Rating ── */}
      <FilterSection title="Rating" defaultOpen={true} badge={ratingActive ? 1 : 0}>
        <div className="flex flex-wrap gap-1.5 px-4">
          {RATING_OPTIONS.map((opt) => {
            const active = minRating === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => { setMinRating(opt.value); setPage(1); }}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                  active
                    ? "border-amber-500/40 bg-amber-500/12 text-amber-600 dark:text-amber-400"
                    : "border-stroke bg-raised text-ink3 hover:border-edge hover:text-ink2"
                }`}
              >
                {opt.value && <span className="text-amber-400">★</span>}
                {opt.label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* ── Quick toggles ── */}
      <FilterSection title="Availability" defaultOpen={true} badge={(inStockOnly ? 1 : 0) + (onSaleOnly ? 1 : 0)}>
        <div className="space-y-2 px-4">
          {/* In stock only */}
          <button
            type="button"
            role="switch"
            aria-checked={inStockOnly}
            onClick={() => { setInStockOnly(!inStockOnly); setPage(1); }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-hover"
          >
            <div className="flex items-center gap-2.5">
              <div className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors ${inStockOnly ? "bg-emerald-500/15" : "bg-raised"}`}>
                <svg className={`size-3.5 ${inStockOnly ? "text-emerald-500" : "text-ink4"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className={`text-[13px] ${inStockOnly ? "font-semibold text-ink" : "text-ink3"}`}>In stock only</span>
            </div>
            <div className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${inStockOnly ? "bg-emerald-500" : "bg-edge"}`}>
              <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${inStockOnly ? "left-4" : "left-0.5"}`} />
            </div>
          </button>

          {/* On sale only */}
          <button
            type="button"
            role="switch"
            aria-checked={onSaleOnly}
            onClick={() => { setOnSaleOnly(!onSaleOnly); setPage(1); }}
            className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 transition-colors hover:bg-hover"
          >
            <div className="flex items-center gap-2.5">
              <div className={`flex size-6 shrink-0 items-center justify-center rounded-md transition-colors ${onSaleOnly ? "bg-rose-500/15" : "bg-raised"}`}>
                <svg className={`size-3.5 ${onSaleOnly ? "text-rose-500" : "text-ink4"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3zM6 6h.008v.008H6V6z" />
                </svg>
              </div>
              <span className={`text-[13px] ${onSaleOnly ? "font-semibold text-ink" : "text-ink3"}`}>On sale only</span>
            </div>
            <div className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${onSaleOnly ? "bg-rose-500" : "bg-edge"}`}>
              <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-all ${onSaleOnly ? "left-4" : "left-0.5"}`} />
            </div>
          </button>
        </div>
      </FilterSection>

      {/* ── Category ── */}
      <FilterSection title="Category" defaultOpen={true} badge={categoryActive ? 1 : 0}>
        {!categories ? (
          /* Loading skeleton */
          <div className="space-y-0.5 px-3" aria-hidden="true">
            {[72, 55, 80, 62, 68].map((w, i) => (
              <div key={i} className="flex items-center gap-2.5 px-2.5 py-2">
                <div className="size-6 shrink-0 animate-shimmer rounded-md" />
                <div className="h-3 animate-shimmer rounded" style={{ width: `${w}%` }} />
              </div>
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="space-y-0.5 px-3">
            {/* All categories */}
            <button
              type="button"
              onClick={() => { setCategoryId(""); setPage(1); }}
              className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all ${
                !categoryId ? "bg-emerald-500/8 text-ink font-semibold" : "text-ink3 hover:bg-hover hover:text-ink2"
              }`}
            >
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${!categoryId ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-raised text-ink4"}`}>
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </span>
              All categories
              {!categoryId && (
                <svg className="ml-auto size-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </button>

            {categories.map((c) => {
              const active = categoryId === String(c.category_id);
              const iconPath = CATEGORY_ICONS[c.name];
              return (
                <button
                  key={c.category_id}
                  type="button"
                  onClick={() => { setCategoryId(String(c.category_id)); setPage(1); }}
                  className={`group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all ${
                    active ? "bg-emerald-500/8 text-ink font-semibold" : "text-ink3 hover:bg-hover hover:text-ink2"
                  }`}
                >
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-md ${active ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-raised text-ink4"}`}>
                    {iconPath ? (
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                      </svg>
                    ) : (
                      <span className="size-1.5 rounded-full bg-current opacity-60" />
                    )}
                  </span>
                  <span className="flex-1 text-left">{c.name}</span>
                  {active && (
                    <svg className="size-3.5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        ) : null}
      </FilterSection>
    </div>
  );
}
