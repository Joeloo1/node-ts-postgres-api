import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useDebounce } from "../hooks/useDebounce";
import { motion, type Variants } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { apiFetch } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid3 } from "../components/ProductSkeleton";
import type { Category, Pagination, Product } from "../lib/types";
import { SearchIcon, XIcon, ArrowRightIcon } from "../components/Icons";

type ProductsRes = { status: string; data: { products: Product[] }; pagination: Pagination };
type CategoriesRes = { status: string; data: { categories: Category[] } };

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const cardFade: Variants = {
  hidden: { opacity: 0, y: 12 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

const categoryEmoji: Record<string, string> = {
  "Electronics": "⚡", "Home & Kitchen": "🏠", "Fashion": "👗",
  "Sports & Outdoors": "🏔", "Beauty": "✨", "Books & Media": "📚",
  "Toys & Games": "🎮", "Garden & Tools": "🌿", "Office": "💼",
  "Groceries & Pantry": "🛒",
};

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQ = searchParams.get("q") ?? "";
  const [inputValue, setInputValue] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const debouncedInput = useDebounce(inputValue, 280);

  const { data: suggestions } = useQuery({
    queryKey: ["search-suggestions", debouncedInput],
    queryFn: async () => {
      const res = await apiFetch<ProductsRes>(
        `/api/v1/products?name=${encodeURIComponent(debouncedInput)}&limit=6&sortBy=rating&order=desc`,
      );
      return res.data.products;
    },
    enabled: debouncedInput.trim().length >= 2,
    staleTime: 30_000,
  });

  /* Close suggestions when clicking outside */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  usePageTitle(query ? `"${query}" — Search` : "Search");

  /* Sync input when URL changes externally */
  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setInputValue(q);
    setQuery(q);
  }, [searchParams.get("q")]);

  const { data, isPending } = useQuery({
    queryKey: ["search", query],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: "24", sortBy: "rating", order: "desc" });
      if (query.trim()) p.set("name", query.trim());
      const res = await apiFetch<ProductsRes>(`/api/v1/products?${p}`);
      return res;
    },
    enabled: Boolean(query.trim()),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiFetch<CategoriesRes>("/api/v1/categories");
      return res.data.categories;
    },
  });

  function submit(q: string) {
    const trimmed = q.trim();
    setQuery(trimmed);
    setSearchParams(trimmed ? { q: trimmed } : {});
  }

  const products = data?.data.products ?? [];
  const total    = data?.pagination?.total ?? 0;
  const hasQuery = Boolean(query.trim());

  return (
    <div className="space-y-10">
      {/* Search bar */}
      <div className="relative mx-auto max-w-2xl">
        <form
          onSubmit={(e) => { e.preventDefault(); setShowSuggestions(false); submit(inputValue); }}
          className="flex items-center gap-3 rounded-xl border border-stroke bg-card px-4 py-3 shadow-sm transition-shadow focus-within:border-emerald-500/40 focus-within:shadow-md"
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
          {inputValue && (
            <button
              type="button"
              onClick={() => { setInputValue(""); submit(""); setShowSuggestions(false); }}
              className="shrink-0 text-ink4 hover:text-ink transition-colors"
              aria-label="Clear"
            >
              <XIcon className="size-4" />
            </button>
          )}
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Search
          </button>
        </form>

        {/* Autocomplete dropdown */}
        {showSuggestions && suggestions && suggestions.length > 0 && debouncedInput.length >= 2 && (
          <div
            ref={suggestionsRef}
            className="absolute left-0 right-0 top-full z-30 mt-1.5 overflow-hidden rounded-xl border border-stroke bg-card shadow-lg"
          >
            {suggestions.map((p) => (
              <button
                key={p.product_id}
                type="button"
                onClick={() => {
                  setInputValue(p.name);
                  setShowSuggestions(false);
                  navigate(`/products/${p.product_id}`);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-raised"
              >
                <div className="size-9 shrink-0 overflow-hidden rounded-lg bg-raised">
                  <img
                    src={p.image ?? ""}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                  {p.brand && <p className="text-[11px] text-ink4">{p.brand}</p>}
                </div>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                  ${p.price.toFixed(2)}
                </p>
              </button>
            ))}
            <div className="border-t border-stroke px-4 py-2.5">
              <button
                type="button"
                onClick={() => { setShowSuggestions(false); submit(inputValue); }}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors"
              >
                See all results for "{inputValue}" →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* No query — show browse categories */}
      {!hasQuery && (
        <div className="space-y-6">
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
                  className="group flex items-center gap-2.5 rounded-xl border border-stroke bg-card px-3.5 py-3 transition-all hover:border-emerald-500/30 hover:bg-raised hover:shadow-sm"
                >
                  <span className="text-lg">{categoryEmoji[cat.name] ?? "🏷"}</span>
                  <span className="text-[13px] font-medium text-ink2 transition-colors group-hover:text-ink truncate">
                    {cat.name}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {hasQuery && (
        <div className="space-y-6">
          {/* Results header */}
          {!isPending && (
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-bold text-ink">
                  {products.length === 0 ? "No results" : `${total} result${total !== 1 ? "s" : ""}`}
                </h2>
                <p className="mt-0.5 text-sm text-ink4">
                  for <span className="font-medium text-ink">"{query}"</span>
                </p>
              </div>
              {products.length > 0 && (
                <Link
                  to={`/products?name=${encodeURIComponent(query)}`}
                  className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-ink3 transition-colors hover:text-ink"
                >
                  Advanced filters
                  <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
              )}
            </div>
          )}

          {isPending ? (
            <ProductSkeletonGrid3 count={12} />
          ) : products.length === 0 ? (
            <div className="rounded-xl border border-stroke bg-card py-20 text-center">
              <SearchIcon className="mx-auto size-10 text-ink4" />
              <p className="mt-4 font-semibold text-ink">Nothing found for "{query}"</p>
              <p className="mt-1 text-sm text-ink4">Try different keywords or browse our categories.</p>
              <button
                type="button"
                onClick={() => { setInputValue(""); submit(""); }}
                className="mt-6 rounded-lg border border-stroke px-5 py-2 text-sm font-semibold text-ink2 transition-colors hover:bg-raised"
              >
                Clear search
              </button>
            </div>
          ) : (
            <motion.div
              key={query}
              className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3"
              variants={stagger}
              initial="hidden"
              animate="show"
            >
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
