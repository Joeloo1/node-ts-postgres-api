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

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "price:asc",      label: "Price: low → high" },
  { value: "price:desc",     label: "Price: high → low" },
  { value: "rating:desc",    label: "Top rated" },
  { value: "name:asc",       label: "Name A–Z" },
];

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3 py-2 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/25";

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
    queryKey: queryKeys.suggestions(debouncedName),
    queryFn: () => productService.getSuggestions(debouncedName.trim()),
    enabled: debouncedName.trim().length >= 2,
    staleTime: 30_000,
  });

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

export interface FilterPanelProps {
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
}

export function FilterPanel({
  name, setName, search, setSearch,
  sortKey, setSortKey,
  categoryId, setCategoryId,
  minPrice, setMinPrice,
  maxPrice, setMaxPrice,
  categories, hasActiveFilters,
  activeFilterCount, clearFilters,
  setPage, onDone,
}: FilterPanelProps) {
  return (
    <div>
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

      <div className="border-b border-stroke px-4 py-4">
        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-widest text-ink4">Search</p>
        <SearchAutocomplete
          name={name} setName={setName}
          search={search} setSearch={setSearch}
          setPage={setPage} onDone={onDone}
        />
      </div>

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
                <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  active ? "border-emerald-500 bg-emerald-500" : "border-edge group-hover:border-ink3"
                }`}>
                  {active && <span className="size-1.5 rounded-full bg-white" />}
                </span>
                <span className={active ? "font-medium" : ""}>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-b border-stroke px-4 py-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">Price range</p>
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

      {categories && categories.length > 0 && (
        <div className="px-4 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">Category</p>
          <div className="space-y-px">
            {[{ id: "", name: "All categories" }, ...categories.map((c) => ({ id: String(c.category_id), name: c.name }))].map(
              ({ id, name: catName }) => {
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
                    <span className={`absolute left-0 top-1/2 h-3.5 w-[3px] -translate-y-1/2 rounded-full transition-all ${
                      active ? "bg-emerald-500 opacity-100" : "bg-transparent opacity-0"
                    }`} />
                    <span className={active ? "font-medium" : ""}>{catName}</span>
                  </button>
                );
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}
