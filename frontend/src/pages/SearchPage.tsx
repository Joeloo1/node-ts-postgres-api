import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useDebounce } from "../hooks/useDebounce";
import { motion, type Variants } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { queryKeys } from "../lib/queryKeys";
import * as productService from "../services/products";
import * as categoryService from "../services/categories";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid3 } from "../components/ProductSkeleton";
import { SearchIcon, XIcon, ArrowRightIcon } from "../components/Icons";

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const cardFade: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

/* Fix #26 — category emoji map with sensible fallbacks */
const categoryEmoji: Record<string, string> = {
  "Electronics": "⚡", "Home & Kitchen": "🏠", "Fashion": "👗",
  "Sports & Outdoors": "🏔️", "Beauty": "✨", "Books & Media": "📚",
  "Toys & Games": "🎮", "Garden & Tools": "🌿", "Office": "💼",
  "Groceries & Pantry": "🛒", "Health": "💊", "Automotive": "🚗",
  "Pet Supplies": "🐾", "Music": "🎵", "Art & Craft": "🎨",
};
function getCategoryEmoji(name: string) {
  return categoryEmoji[name] ?? name.charAt(0).toUpperCase();
}

/* Fix #9 — recent searches localStorage */
const RECENT_KEY = "northline_recent_searches";
const MAX_RECENT = 6;

function getRecentSearches(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function saveRecentSearch(q: string) {
  if (!q.trim()) return;
  const existing = getRecentSearches().filter((s) => s !== q.trim());
  localStorage.setItem(RECENT_KEY, JSON.stringify([q.trim(), ...existing].slice(0, MAX_RECENT)));
}
function removeRecentSearch(q: string) {
  const updated = getRecentSearches().filter((s) => s !== q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
}
function clearAllRecentSearches() {
  localStorage.removeItem(RECENT_KEY);
}

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debouncedInput = useDebounce(inputValue, 280);

  const { data: suggestions } = useQuery({
    queryKey: queryKeys.suggestions(debouncedInput),
    queryFn: () => productService.getSuggestions(debouncedInput),
    enabled: debouncedInput.trim().length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  usePageTitle(query ? `"${query}" — Search` : "Search");

  /* Adopt URL changes (back/forward, external links) during render */
  const urlQuery = searchParams.get("q") ?? "";
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  if (urlQuery !== lastUrlQuery) {
    setLastUrlQuery(urlQuery);
    setInputValue(urlQuery);
    setQuery(urlQuery);
  }

  const { data, isPending } = useQuery({
    queryKey: queryKeys.search(query),
    queryFn: () => productService.getProducts({ name: query.trim(), limit: 24, sortBy: "rating", order: "desc" }),
    enabled: Boolean(query.trim()),
  });

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoryService.getCategories,
  });

  function submit(q: string) {
    const trimmed = q.trim();
    setQuery(trimmed);
    setSearchParams(trimmed ? { q: trimmed } : {});
    if (trimmed) {
      saveRecentSearch(trimmed);
      setRecentSearches(getRecentSearches());
    }
    setShowSuggestions(false);
  }

  const products = data?.products ?? [];
  const total    = data?.pagination?.total ?? 0;
  const hasQuery = Boolean(query.trim());

  return (
    <div className="space-y-10">
      {/* Search bar */}
      <div className="relative mx-auto max-w-2xl">
        <form
          onSubmit={(e) => { e.preventDefault(); submit(inputValue); }}
          className="flex items-center gap-3 rounded-full border border-stroke bg-card px-5 py-3.5 shadow-sm transition-all focus-within:border-emerald-500/40 focus-within:shadow-md focus-within:shadow-emerald-500/5"
        >
          <SearchIcon className="size-5 shrink-0 text-ink4" />
          <input
            ref={inputRef}
            autoFocus
            value={inputValue}
            onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            className="flex-1 bg-transparent text-[15px] text-ink placeholder:text-ink4 focus:outline-none"
            placeholder="Search for products, brands, categories…"
            aria-label="Search"
            autoComplete="off"
          />
          {!inputValue && (
            <span className="hidden shrink-0 items-center gap-1 rounded-md border border-stroke bg-raised px-1.5 py-0.5 text-[10px] font-medium text-ink4 sm:flex">
              <span className="text-[9px]">↵</span> Enter
            </span>
          )}
          {inputValue && (
            <button type="button" onClick={() => { setInputValue(""); submit(""); setShowSuggestions(false); }} className="shrink-0 text-ink4 hover:text-ink transition-colors" aria-label="Clear">
              <XIcon className="size-4" />
            </button>
          )}
          <button type="submit" className="relative shrink-0 overflow-hidden rounded-full bg-emerald-600 px-5 py-1.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition-all hover:bg-emerald-500 active:scale-[0.97]">
            <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
            Search
          </button>
        </form>

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions && suggestions.length > 0 && debouncedInput.length >= 2 && (
          <div ref={suggestionsRef} className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-stroke bg-card shadow-lg">
            {suggestions.map((p) => (
              <button
                key={p.product_id}
                type="button"
                onClick={() => { setInputValue(p.name); setShowSuggestions(false); navigate(`/products/${p.product_id}`); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised"
              >
                <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-raised">
                  <img src={p.image ?? ""} alt="" className="h-full w-full object-cover" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                  {p.brand && <p className="text-[11px] text-ink4">{p.brand}</p>}
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">${p.price.toFixed(2)}</p>
              </button>
            ))}
            <div className="border-t border-stroke px-4 py-2.5">
              <button type="button" onClick={() => { setShowSuggestions(false); submit(inputValue); }} className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors">
                See all results for "{inputValue}" →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* No query — Fix #9: recent searches + categories */}
      {!hasQuery && (
        <div className="space-y-8">
          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-ink">Recent searches</h2>
                <button
                  type="button"
                  onClick={() => { clearAllRecentSearches(); setRecentSearches([]); }}
                  className="text-[11px] font-medium text-ink4 hover:text-ink3 transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((q) => (
                  <span key={q} className="group inline-flex items-center gap-2 rounded-full border border-stroke bg-card px-3.5 py-1.5">
                    <button
                      type="button"
                      onClick={() => { setInputValue(q); submit(q); }}
                      className="flex items-center gap-1.5 text-[13px] text-ink2 hover:text-ink transition-colors"
                    >
                      <SearchIcon className="size-3 text-ink4" />
                      {q}
                    </button>
                    <button
                      type="button"
                      onClick={() => { removeRecentSearch(q); setRecentSearches(getRecentSearches()); }}
                      className="text-ink4 hover:text-ink3 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Remove"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Browse categories */}
          <div className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Browse by category</h2>
              <p className="mt-1 text-sm text-ink4">Not sure what you're looking for? Start here.</p>
            </div>
            {categories && (
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {categories.map((cat) => (
                  <Link
                    key={cat.category_id}
                    to={`/products?category_id=${cat.category_id}`}
                    className="group flex items-center gap-2.5 rounded-xl border border-stroke bg-card px-3.5 py-3 transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5 hover:shadow-sm"
                  >
                    <span className="text-lg">{getCategoryEmoji(cat.name)}</span>
                    <span className="text-[13px] font-medium text-ink2 transition-colors group-hover:text-emerald-700 dark:group-hover:text-emerald-400 truncate">{cat.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Results */}
      {hasQuery && (
        <div className="space-y-6">
          {!isPending && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">
                  {products.length === 0 ? "No results" : `${total} result${total !== 1 ? "s" : ""}`}
                </h2>
                <p className="mt-0.5 text-sm text-ink4">for <span className="font-medium text-ink">"{query}"</span></p>
              </div>
              {products.length > 0 && (
                <Link to={`/products?name=${encodeURIComponent(query)}`} className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink3 transition-colors hover:text-ink">
                  Advanced filters
                  <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          )}

          {isPending ? (
            <ProductSkeletonGrid3 count={12} />
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-stroke bg-card py-20 text-center">
              <div className="mx-auto flex size-24 items-center justify-center rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 text-emerald-600 shadow-lg shadow-emerald-500/10 dark:text-emerald-400">
                <SearchIcon className="size-12" />
              </div>
              <p className="mt-6 text-lg font-semibold text-ink">Nothing found for "{query}"</p>
              <p className="mt-1.5 text-sm text-ink4">Try a different keyword, check your spelling, or browse a category.</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                {["Electronics", "Fashion", "Home & Kitchen", "Sports"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setInputValue(s); submit(s); }}
                    className="rounded-full border border-stroke bg-raised px-3.5 py-1.5 text-xs font-medium text-ink2 transition-colors hover:border-emerald-500/30 hover:bg-emerald-500/8 hover:text-emerald-600"
                  >
                    {s}
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => { setInputValue(""); submit(""); }} className="mt-5 rounded-lg border border-stroke px-5 py-2 text-sm font-semibold text-ink2 transition-colors hover:bg-raised">
                Clear search
              </button>
            </div>
          ) : (
            <motion.div key={query} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" variants={stagger} initial="hidden" animate="show">
              {products.map((p) => (
                <motion.div key={p.product_id} variants={cardFade}>
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      )}
    </div>
  );
}
