import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid } from "../components/ProductSkeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { queryKeys } from "../lib/queryKeys";
import * as productService from "../services/products";
import * as categoryService from "../services/categories";
import { productImageUrl } from "../lib/productImage";
import {
  ArrowRightIcon, TruckIcon, ShieldIcon, PackageIcon,
  StarIcon, SearchIcon,
} from "../components/Icons";
import type { Product } from "../lib/types";

/* ── Animation presets ─────────────────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};
const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.055 } },
};
const cardFade: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] } },
};

/* ── Hero mosaic image with error fallback ─────────────────── */
function HeroMosaicImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err) {
    return (
      <div className={`relative w-full h-full flex items-center justify-center overflow-hidden ${className ?? ""}`}
        style={{ background: "linear-gradient(145deg, #071410 0%, #030a07 100%)" }}>
        <div className="absolute inset-0 dot-grid opacity-20" />
        <div className="absolute bottom-0 right-0 size-48 rounded-full bg-emerald-600/10 blur-3xl" />
        <svg className="relative size-8 text-emerald-800/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M9 9.75h.008v.008H9V9.75z" />
        </svg>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErr(true)}
      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05] ${className ?? ""}`}
      loading="eager"
    />
  );
}

/* ── Category icon map ─────────────────────────────────────── */
function CategoryIcon({ name, className = "size-5" }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    "Electronics":        "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    "Home & Kitchen":     "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
    "Fashion":            "M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
    "Sports & Outdoors":  "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z",
    "Beauty":             "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z",
    "Books & Media":      "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
    "Toys & Games":       "M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z",
    "Garden & Tools":     "M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18",
    "Office":             "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z",
    "Groceries & Pantry": "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
  };
  const d = paths[name];
  const fallback = "M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z";
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d ?? fallback} />
    </svg>
  );
}

/* ── Category gradient map ─────────────────────────────────── */
const CATEGORY_GRADIENTS: Record<string, { from: string; to: string; glow: string; textClass: string; iconBgClass: string }> = {
  "Electronics":        { from: "#0f2340", to: "#1a3a6b", glow: "#2563eb", textClass: "text-blue-200",    iconBgClass: "bg-blue-500/20" },
  "Home & Kitchen":     { from: "#240d40", to: "#3b1f6b", glow: "#7c3aed", textClass: "text-violet-200",  iconBgClass: "bg-violet-500/20" },
  "Fashion":            { from: "#3d0d24", to: "#6b1f3a", glow: "#e11d48", textClass: "text-rose-200",    iconBgClass: "bg-rose-500/20" },
  "Sports & Outdoors":  { from: "#062819", to: "#0f4028", glow: "#059669", textClass: "text-emerald-200", iconBgClass: "bg-emerald-500/20" },
  "Beauty":             { from: "#3d1a0a", to: "#6b2d12", glow: "#ea580c", textClass: "text-orange-200",  iconBgClass: "bg-orange-500/20" },
  "Books & Media":      { from: "#0a2030", to: "#0f3050", glow: "#0284c7", textClass: "text-sky-200",     iconBgClass: "bg-sky-500/20" },
  "Toys & Games":       { from: "#281a05", to: "#4a2e08", glow: "#d97706", textClass: "text-amber-200",   iconBgClass: "bg-amber-500/20" },
  "Garden & Tools":     { from: "#0a2810", to: "#0f4018", glow: "#16a34a", textClass: "text-lime-200",    iconBgClass: "bg-lime-500/20" },
  "Office":             { from: "#0a1828", to: "#0f2a44", glow: "#0ea5e9", textClass: "text-sky-200",     iconBgClass: "bg-sky-500/20" },
  "Groceries & Pantry": { from: "#281a05", to: "#403010", glow: "#ca8a04", textClass: "text-yellow-200",  iconBgClass: "bg-yellow-500/20" },
};
const CATEGORY_FALLBACK = { from: "#0d0d1a", to: "#1a1a2e", glow: "#6366f1", textClass: "text-white/80", iconBgClass: "bg-white/10" };

/* ── Static data ───────────────────────────────────────────── */
const trustItems = [
  { Icon: TruckIcon,   title: "Free shipping",   desc: "On all orders over $50" },
  { Icon: PackageIcon, title: "Easy returns",     desc: "30-day hassle-free policy" },
  { Icon: ShieldIcon,  title: "Secure checkout", desc: "256-bit SSL encryption" },
  { Icon: StarIcon,    title: "Top-rated",        desc: "Quality-curated products" },
];


const BRANDS = [
  "Sony", "Apple", "Samsung", "Nike", "Adidas", "Levi's",
  "Dyson", "Bose", "Canon", "Dell", "LG", "Philips",
  "Bosch", "Braun", "KitchenAid", "Vitamix",
];

/* ── Countdown to midnight ─────────────────────────────────── */
function useEndOfDayCountdown() {
  const getSecsLeft = () => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  };
  const [secs, setSecs] = useState(getSecsLeft);
  useEffect(() => {
    const id = setInterval(() => setSecs(getSecsLeft()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = String(Math.floor(secs / 3600)).padStart(2, "0");
  const m = String(Math.floor((secs % 3600) / 60)).padStart(2, "0");
  const s = String(secs % 60).padStart(2, "0");
  return { h, m, s };
}

/* ══════════════════════════════════════════════════════════════ */
export function HomePage() {
  usePageTitle("Shop");
  const { token } = useAuth();
  const isSignedIn = Boolean(token);
  const navigate = useNavigate();

  const { data: productsData, isPending } = useQuery({
    queryKey: queryKeys.products("featured"),
    queryFn: () => productService.getProducts({ limit: 8, sortBy: "createdAt", order: "desc" }),
  });
  const products = productsData?.products;

  const { data: categoriesData, isPending: categoriesPending } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoryService.getCategories,
  });
  const categories = categoriesData;

  const { data: deals } = useQuery({
    queryKey: queryKeys.deals(),
    queryFn: () => productService.getDeals(8),
  });

  const { data: bestSellersData, isPending: bestSellersPending } = useQuery({
    queryKey: queryKeys.bestSellers(),
    queryFn: () => productService.getProducts({ limit: 8, sortBy: "rating", order: "desc" }),
  });
  const bestSellers = bestSellersData?.products;

  /* Real social proof: actual top-rated product + actual best discount */
  const topRated = bestSellers?.[0];
  const topDeal = deals?.[0];

  /* Brands actually present in the loaded catalog (static list as fallback
     until queries resolve or if the catalog has too few distinct brands) */
  const carriedBrands = useMemo(() => {
    const seen = new Set<string>();
    [products, bestSellers, deals].forEach((list) =>
      list?.forEach((p) => { if (p.brand) seen.add(p.brand); }),
    );
    return seen.size >= 6 ? [...seen] : BRANDS;
  }, [products, bestSellers, deals]);

  const { products: recentlyViewed, hasAny: hasRecentlyViewed } = useRecentlyViewed();

  return (
    <div className="space-y-24 sm:space-y-28">

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-6 lg:-mx-8">
        {/* Left-side atmosphere — mobile + desktop dark mode */}
        <div className="absolute -left-48 top-1/2 -translate-y-1/2 size-[600px] rounded-full opacity-0 dark:opacity-100 transition-opacity bg-emerald-600/[0.06] blur-[130px]" />

        {/* Right panel — desktop */}
        <div
          className="absolute inset-y-0 right-0 hidden w-[48%] lg:block"
          style={{ background: "linear-gradient(160deg, #070e09 0%, #030806 100%)" }}
        >
          <div className="absolute inset-0 dot-grid opacity-[1]" />
          <div className="absolute -bottom-32 -right-32 size-[600px] rounded-full bg-emerald-500/[0.18] blur-[80px]" />
          <div className="absolute top-1/4 right-1/4 size-48 rounded-full bg-emerald-400/[0.08] blur-2xl" />
          <div className="absolute -top-16 right-1/2 size-72 rounded-full bg-teal-400/[0.07] blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[600px] items-center gap-12 py-14 lg:grid-cols-2 lg:py-20 xl:min-h-[660px]">

            {/* ── Left: copy ── */}
            <motion.div
              className="space-y-7 lg:pr-8"
              initial={{ opacity: 0, y: 32 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className="h-px w-8 bg-emerald-500" />
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Premium collection {new Date().getFullYear()}</span>
              </motion.div>

              <div className="space-y-2">
                <h1 className="font-display text-[2.2rem] font-bold leading-[1.0] tracking-[-0.03em] text-ink sm:text-[2.8rem] lg:text-[3.2rem] xl:text-[3.6rem]">
                  Quality goods,
                  <br />
                  <span className="text-emerald-600 dark:text-emerald-400">
                    thoughtfully
                    <br />
                    curated.
                  </span>
                </h1>
                <p className="max-w-[420px] text-[16px] leading-[1.75] text-ink3 pt-2">
                  From electronics to everyday essentials — honest pricing, seamless checkout, and products worth keeping.
                </p>
              </div>

              {/* Hero search bar */}
              <HeroSearchBar onSearch={(q) => navigate(`/search?q=${encodeURIComponent(q)}`)} />

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to="/products"
                  className="group relative inline-flex items-center gap-2.5 overflow-hidden rounded-xl bg-emerald-600 px-7 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/40 active:scale-[0.97]"
                >
                  <span className="absolute inset-0 -translate-x-full animate-[sweep_4s_ease-in-out_1s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                  Shop collection
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                {!isSignedIn && (
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-transparent px-7 py-3.5 text-[14px] font-semibold text-ink2 transition-all hover:bg-raised hover:border-edge active:scale-[0.97]"
                  >
                    Join free
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                {topRated?.rating != null && (
                  <Link
                    to={`/products/${topRated.product_id}`}
                    className="group flex items-center gap-3 rounded-xl border border-stroke bg-card/70 py-1.5 pl-1.5 pr-4 transition-colors hover:border-edge"
                  >
                    <img
                      src={productImageUrl(topRated)}
                      alt={topRated.name}
                      className="size-9 shrink-0 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <StarIcon
                            key={s}
                            className="size-3 text-amber-400"
                            filled={s <= Math.round(topRated.rating!)}
                          />
                        ))}
                        <span className="ml-0.5 text-[11px] font-semibold tabular-nums text-ink2">
                          {topRated.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-0.5 max-w-[220px] truncate text-[11px] text-ink4">
                        Customer favourite · {topRated.name}
                      </p>
                    </div>
                  </Link>
                )}
                <div className="flex items-center gap-1.5 text-[11px] text-ink3">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Free shipping over $50
                </div>
              </div>
            </motion.div>

            {/* ── Right: asymmetric product mosaic ── */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.65, delay: 0.12, ease: [0.25, 0.1, 0.25, 1] }}
            >
              {isPending || !products?.length ? (
                <div className="hidden lg:grid grid-cols-[1.4fr_1fr] gap-3 h-[500px]">
                  <div className="animate-shimmer rounded-2xl bg-raised" />
                  <div className="grid grid-rows-2 gap-3">
                    <div className="animate-shimmer rounded-2xl bg-raised" />
                    <div className="animate-shimmer rounded-2xl bg-raised" />
                  </div>
                </div>
              ) : (
                <div className="hidden lg:grid grid-cols-[1.4fr_1fr] gap-3 h-[500px]">
                  <Link to={`/products/${products[0].product_id}`} className="group relative overflow-hidden rounded-2xl bg-raised">
                    <HeroMosaicImg src={productImageUrl(products[0])} alt={products[0].name} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                    <span className="absolute left-3 top-3 rounded-md bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white shadow">New</span>
                    <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/10 bg-black/70 px-3.5 py-3 backdrop-blur-md transition-all duration-300 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="truncate text-[12px] font-medium text-white/80">{products[0].name}</p>
                      <p className="mt-0.5 text-base font-bold text-white">
                        ${(products[0].discount ? products[0].price * (1 - products[0].discount / 100) : products[0].price).toFixed(2)}
                      </p>
                    </div>
                  </Link>
                  <div className="grid grid-rows-2 gap-3">
                    {products.slice(1, 3).map((p) => (
                      <Link key={p.product_id} to={`/products/${p.product_id}`} className="group relative overflow-hidden rounded-2xl bg-raised">
                        <HeroMosaicImg src={productImageUrl(p)} alt={p.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        <div className="absolute inset-x-2 bottom-2 rounded-lg border border-white/10 bg-black/70 px-2.5 py-2 backdrop-blur-md transition-all duration-300 translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                          <p className="truncate text-[11px] font-medium text-white/80">{p.name}</p>
                          <p className="text-sm font-bold text-white">
                            ${(p.discount ? p.price * (1 - p.discount / 100) : p.price).toFixed(2)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Mobile scroll strip */}
              {!isPending && products && products.length > 0 && (
                <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-none lg:hidden">
                  {products.slice(0, 6).map((p, i) => (
                    <Link key={p.product_id} to={`/products/${p.product_id}`} className="group relative shrink-0 w-44 overflow-hidden rounded-2xl bg-raised">
                      <img
                        src={productImageUrl(p)}
                        alt={p.name}
                        className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                        loading={i < 2 ? "eager" : "lazy"}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute inset-x-2 bottom-2 rounded-lg border border-white/10 bg-black/65 px-2.5 py-2 backdrop-blur-md">
                        <p className="truncate text-[10px] font-medium text-white/80">{p.name}</p>
                        <p className="text-xs font-bold text-white">
                          ${(p.discount ? p.price * (1 - p.discount / 100) : p.price).toFixed(2)}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Floating "deal of the day" card — real top discount */}
              {topDeal?.discount != null && topDeal.discount > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                  className="absolute -bottom-4 -left-4 hidden lg:block"
                >
                  <Link
                    to={`/products/${topDeal.product_id}`}
                    className="flex items-center gap-3 rounded-2xl border border-stroke bg-card px-3.5 py-3 shadow-xl shadow-black/15 transition-colors hover:border-edge"
                  >
                    <img
                      src={productImageUrl(topDeal)}
                      alt={topDeal.name}
                      className="size-10 shrink-0 rounded-xl object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-ink">Deal of the day</p>
                      <p className="text-[11px] text-ink4">
                        <span className="font-bold text-red-500">−{Math.round(topDeal.discount)}%</span>
                        {" · now "}
                        <span className="font-semibold tabular-nums text-ink2">
                          ${(topDeal.price * (1 - topDeal.discount / 100)).toFixed(2)}
                        </span>
                      </p>
                    </div>
                    <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                      Sale
                    </span>
                  </Link>
                </motion.div>
              )}
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══ BRAND STRIP ══════════════════════════════════════ */}
      <BrandStrip brands={carriedBrands} />

      {/* ══ TRUST BADGES ═════════════════════════════════════ */}
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
        className="overflow-hidden rounded-2xl border border-stroke bg-card/70 ring-glass backdrop-blur-sm"
      >
        <div className="grid grid-cols-2 divide-x divide-y divide-stroke lg:grid-cols-4 lg:divide-y-0">
          {trustItems.map(({ Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-4 p-5 sm:p-6">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                <Icon className="size-7" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink">{title}</p>
                <p className="mt-0.5 text-[12px] text-ink4 leading-snug">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ══ CATEGORIES ═══════════════════════════════════════ */}
      <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-[5px] h-6 w-0.5 shrink-0 rounded-full bg-emerald-500" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Collections</p>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Shop by category</h2>
            </div>
          </div>
          <Link
            to="/products"
            className="group mb-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink3 transition-all hover:border-edge hover:text-ink"
          >
            All categories <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {categoriesPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-shimmer min-h-[150px] rounded-2xl bg-raised" />
            ))}
          </div>
        ) : categories && categories.length > 0 ? (
          <>
            {/* Mobile 2-col */}
            <div className="grid grid-cols-2 gap-3 sm:hidden">
              {categories.map((cat) => {
                const g = CATEGORY_GRADIENTS[cat.name] ?? CATEGORY_FALLBACK;
                return (
                  <Link
                    key={cat.category_id}
                    to={`/products?category_id=${cat.category_id}`}
                    className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-4 min-h-[110px] transition-all duration-300 active:scale-[0.98]"
                    style={{ background: `linear-gradient(145deg, ${g.from}, ${g.to})` }}
                  >
                    <div className="absolute -right-4 -top-4 size-20 rounded-full blur-2xl opacity-25" style={{ background: g.glow }} />
                    <div className={`flex size-11 items-center justify-center rounded-xl ${g.iconBgClass}`}>
                      <CategoryIcon name={cat.name} className={`size-6 ${g.textClass}`} />
                    </div>
                    <div className="flex items-end justify-between gap-1 mt-3">
                      <span className={`text-[12px] font-semibold leading-tight ${g.textClass}`}>{cat.name}</span>
                      <ArrowRightIcon className={`size-3 shrink-0 opacity-40 group-hover:opacity-90 ${g.textClass}`} />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop 5-col */}
            <div className="hidden grid-cols-3 gap-4 sm:grid md:grid-cols-4 lg:grid-cols-5">
              {categories.map((cat, idx) => {
                const g = CATEGORY_GRADIENTS[cat.name] ?? CATEGORY_FALLBACK;
                return (
                  <motion.div
                    key={cat.category_id}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: idx * 0.045 }}
                  >
                    <Link
                      to={`/products?category_id=${cat.category_id}`}
                      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl p-5 min-h-[150px] transition-all duration-300 hover:scale-[1.025] hover:shadow-2xl"
                      style={{ background: `linear-gradient(145deg, ${g.from}, ${g.to})` }}
                    >
                      <div className="absolute -right-6 -top-6 size-28 rounded-full opacity-20 blur-2xl transition-opacity duration-300 group-hover:opacity-40" style={{ background: g.glow }} />
                      <div className={`relative flex size-13 items-center justify-center rounded-xl ${g.iconBgClass}`}>
                        <CategoryIcon name={cat.name} className={`size-7 ${g.textClass}`} />
                      </div>
                      <div className="relative flex items-end justify-between gap-2 mt-5">
                        <span className={`text-[13px] font-semibold leading-tight ${g.textClass}`}>{cat.name}</span>
                        <ArrowRightIcon className={`size-3.5 shrink-0 opacity-40 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 ${g.textClass}`} />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </>
        ) : null}
      </motion.section>

      {/* ══ DEALS (with countdown timer) ═════════════════════ */}
      {deals && deals.length > 0 && (
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-[5px] h-6 w-0.5 shrink-0 rounded-full bg-red-500" />
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                    <span className="relative inline-flex size-2 rounded-full bg-red-500" />
                  </span>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-red-500">Flash sale</p>
                </div>
                <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Today's deals</h2>
                <p className="mt-1 text-[13px] text-ink4">Limited quantities — while stock lasts.</p>
              </div>
            </div>
            <div className="mb-1 flex flex-col items-end gap-2.5">
              <DealsCountdown />
              <Link
                to="/deals"
                className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink3 transition-all hover:border-edge hover:text-ink"
              >
                All deals <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <motion.div
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
          >
            {deals.map((p) => (
              <motion.div key={p.product_id} variants={cardFade}>
                <Link
                  to={`/products/${p.product_id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-transparent bg-card transition-all duration-300 hover:border-red-500/20 hover:shadow-xl hover:shadow-red-500/5"
                >
                  <div className="relative aspect-square overflow-hidden bg-raised">
                    <img
                      src={productImageUrl(p)}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[10px] font-bold tracking-wide text-white shadow-md">
                      −{Math.round(p.discount!)}%
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{p.name}</p>
                    <div className="mt-2.5 flex items-baseline gap-2">
                      <span className="text-sm font-bold tabular-nums text-ink">
                        ${(p.price * (1 - p.discount! / 100)).toFixed(2)}
                      </span>
                      <span className="text-[11px] tabular-nums text-ink4 line-through">${p.price.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Save ${(p.price * p.discount! / 100).toFixed(2)}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* ══ BEST SELLERS ═════════════════════════════════════ */}
      <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-[5px] h-6 w-0.5 shrink-0 rounded-full bg-amber-500" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Best sellers</p>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Most popular</h2>
              <p className="mt-1 text-[13px] text-ink4">Our highest-rated products, ranked by customer reviews.</p>
            </div>
          </div>
          <Link
            to="/products?sortBy=rating&order=desc"
            className="group mb-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink3 transition-all hover:border-edge hover:text-ink"
          >
            View all <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {bestSellersPending ? (
          <ProductSkeletonGrid count={8} />
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
          >
            {bestSellers?.map((p, i) => (
              <motion.div key={p.product_id} variants={cardFade} className="relative">
                {i < 3 && (
                  <div className="absolute -left-1.5 -top-1.5 z-10 flex size-6 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white shadow-md shadow-amber-500/30">
                    {i + 1}
                  </div>
                )}
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>

      {/* ══ FEATURED EDITORIAL BANNER ════════════════════════ */}
      <EditorialBanner />

      {/* ══ NEW ARRIVALS ═════════════════════════════════════ */}
      <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-[5px] h-6 w-0.5 shrink-0 rounded-full bg-emerald-500" />
            <div>
              <div className="flex items-center gap-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Just dropped</p>
                <span className="rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">New</span>
              </div>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">New arrivals</h2>
            </div>
          </div>
          <Link
            to="/products"
            className="group mb-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink3 transition-all hover:border-edge hover:text-ink"
          >
            View all <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {isPending ? (
          <ProductSkeletonGrid count={8} />
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
          >
            {products?.map((p) => (
              <motion.div key={p.product_id} variants={cardFade}>
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>

      {/* ══ RECENTLY VIEWED ══════════════════════════════════ */}
      {hasRecentlyViewed && recentlyViewed.length > 0 && (
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-[5px] h-6 w-0.5 shrink-0 rounded-full bg-ink4/60" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Your history</p>
                <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Recently viewed</h2>
              </div>
            </div>
            <Link
              to="/products"
              className="group mb-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink3 transition-all hover:border-edge hover:text-ink"
            >
              Browse more <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <motion.div
            className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-4"
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
          >
            {recentlyViewed.map((p) => (
              <motion.div key={p.product_id} variants={cardFade}>
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
      )}

      {/* ══ DISCOVER FEED ════════════════════════════════════ */}
      <DiscoverSection />

      {/* ══ CTA BANNER ═══════════════════════════════════════ */}
      <motion.section
        variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
        className="relative overflow-hidden rounded-3xl"
        style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 45%, #0f172a 100%)" }}
      >
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
        <div className="absolute -left-24 -top-24 size-[400px] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 size-72 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="absolute inset-0 -translate-x-full animate-[sweep_7s_ease-in-out_3s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" />
        <div className="relative px-8 py-16 text-center sm:px-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-400/70">Northline promise</p>
          <h2 className="mx-auto mt-3 max-w-lg font-display text-2xl font-bold leading-[1.12] text-white sm:text-3xl lg:text-[2rem]">
            Every order. Every time.
            <br />
            <span className="text-emerald-300">Delivered right.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-emerald-100/50">
            Quality essentials, fast dispatch, and honest pricing — backed by a 30-day, no-questions-asked return policy.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/products"
              className="inline-flex items-center gap-2.5 rounded-xl bg-white px-8 py-3.5 text-[14px] font-semibold text-emerald-900 shadow-xl shadow-black/25 transition-all hover:bg-emerald-50 active:scale-[0.98]"
            >
              Browse the catalog <ArrowRightIcon className="size-4" />
            </Link>
            {!isSignedIn && (
              <Link
                to="/register"
                className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-8 py-3.5 text-[14px] font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.98]"
              >
                Create free account
              </Link>
            )}
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {["Free shipping over $50", "30-day returns", "Secure checkout"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[12px] text-emerald-200/50">
                <span className="size-1 rounded-full bg-emerald-400/50" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </motion.section>
    </div>
  );
}

/* ══ SUB-COMPONENTS ══════════════════════════════════════════ */

function HeroSearchBar({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState("");
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (trimmed) onSearch(trimmed);
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md items-center gap-2 rounded-xl border border-stroke bg-card/80 p-1.5 shadow-lg shadow-black/10 backdrop-blur-sm transition-all focus-within:border-emerald-500/50 focus-within:shadow-emerald-500/[0.08] dark:bg-card/60"
    >
      <SearchIcon className="ml-2 size-4 shrink-0 text-ink4" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search products, brands…"
        className="flex-1 bg-transparent text-[14px] text-ink placeholder:text-ink4 focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-500 active:scale-[0.97]"
      >
        Search
      </button>
    </form>
  );
}

function DealsCountdown() {
  const { h, m, s } = useEndOfDayCountdown();
  const units = [h, m, s];
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-medium text-ink4">Ends in</span>
      {units.map((unit, i) => (
        <span key={i} className="flex items-center gap-1">
          <span className="flex min-w-[32px] items-center justify-center rounded-md bg-red-600 px-2 py-1 font-mono text-[14px] font-bold tabular-nums text-white shadow-sm">
            {unit}
          </span>
          {i < 2 && <span className="text-[14px] font-bold text-red-500">:</span>}
        </span>
      ))}
    </div>
  );
}

function BrandStrip({ brands }: { brands: string[] }) {
  const brandsWithDots = brands.reduce<Array<{ type: "brand" | "dot"; value: string }>>((acc, brand, i) => {
    acc.push({ type: "brand", value: brand });
    if (i < brands.length - 1) acc.push({ type: "dot", value: `dot-${i}` });
    return acc;
  }, []);
  const doubled = [...brandsWithDots, ...brandsWithDots];

  return (
    <div className="relative overflow-hidden border-y border-stroke bg-raised/30 py-6">
      <p className="mb-5 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-ink4">Carried brands</p>
      <div className="flex" style={{ maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)" }}>
        <div className="flex shrink-0 animate-[marquee_32s_linear_infinite] items-center">
          {doubled.map((item, i) =>
            item.type === "dot" ? (
              <span key={`a-${i}`} className="mx-5 inline-block size-1.5 shrink-0 rounded-full bg-stroke" aria-hidden="true" />
            ) : (
              <span key={`a-${i}`} className="shrink-0 text-[13px] font-bold uppercase tracking-[0.07em] text-ink3/60">
                {item.value}
              </span>
            )
          )}
        </div>
        <div className="flex shrink-0 animate-[marquee_32s_linear_infinite] items-center" aria-hidden="true">
          {doubled.map((item, i) =>
            item.type === "dot" ? (
              <span key={`b-${i}`} className="mx-5 inline-block size-1.5 shrink-0 rounded-full bg-stroke" />
            ) : (
              <span key={`b-${i}`} className="shrink-0 text-[13px] font-bold uppercase tracking-[0.07em] text-ink3/60">
                {item.value}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function EditorialBanner() {
  return (
    <motion.div
      variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
      className="group relative overflow-hidden rounded-3xl"
      style={{ background: "linear-gradient(125deg, #0a1628 0%, #0f2340 40%, #112d1a 100%)" }}
    >
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
      <div className="absolute right-0 top-0 h-full w-1/2 opacity-20" style={{ background: "radial-gradient(ellipse at 80% 50%, #10b981 0%, transparent 70%)" }} />
      <div className="absolute inset-0 -translate-x-full animate-[sweep_9s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

      <div className="relative flex flex-col gap-8 px-8 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-12 sm:py-14">
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-px w-6 bg-emerald-400/60" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/70">Featured collection</span>
          </div>
          <h2 className="font-display text-2xl font-bold leading-[1.1] text-white sm:text-3xl">
            Essentials for
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
              modern living.
            </span>
          </h2>
          <p className="max-w-sm text-[15px] leading-relaxed text-white/50">
            Curated staples that work harder, last longer, and look better — at prices that make sense.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {["Free returns", "Quality guaranteed", "Ships in 24h"].map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/60">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 sm:items-end">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 backdrop-blur-sm">
            <div className="space-y-3.5">
              {[
                { Icon: TruckIcon,   title: "Free shipping",  desc: "On orders over $50" },
                { Icon: PackageIcon, title: "30-day returns", desc: "No questions asked" },
                { Icon: ShieldIcon,  title: "Secure checkout", desc: "256-bit SSL encryption" },
              ].map(({ Icon, title, desc }) => (
                <div key={title} className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                    <Icon className="size-6 text-emerald-300" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold leading-tight text-white">{title}</p>
                    <p className="text-[11px] text-white/40">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Link
            to="/products"
            className="group/btn inline-flex items-center gap-2.5 rounded-xl bg-emerald-500 px-7 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            Shop the collection
            <ArrowRightIcon className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
          <Link to="/deals" className="text-center text-[12px] text-white/40 transition-colors hover:text-white/70">
            See today's deals →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function DiscoverSection() {
  const [pages, setPages] = useState<Product[][]>([]);
  const [cursor, setCursor] = useState<string | null | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const { data: initial, isPending } = useQuery({
    queryKey: ["home-feed-initial"],
    queryFn: () => productService.getProductsFeed(undefined, 8),
    staleTime: 120_000,
  });

  useEffect(() => {
    if (initial) {
      setPages([initial.products]);
      setCursor(initial.nextCursor);
      setHasMore(initial.nextCursor !== null);
    }
  }, [initial]);

  const loadMore = useCallback(async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await productService.getProductsFeed(cursor, 8);
      setPages((prev) => [...prev, next.products]);
      setCursor(next.nextCursor);
      setHasMore(next.nextCursor !== null);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, loadingMore]);

  const allProducts = pages.flat();
  if (!isPending && allProducts.length === 0) return null;

  return (
    <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Discover</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">More to explore</h2>
          <p className="mt-1.5 text-[13px] text-ink4">Fresh additions, updated daily.</p>
        </div>
        <Link
          to="/products"
          className="group mb-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink3 transition-all hover:border-edge hover:text-ink"
        >
          Browse all <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="animate-shimmer aspect-square rounded-2xl bg-raised" />
          ))}
        </div>
      ) : (
        <>
          <motion.div
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
          >
            {allProducts.map((p) => (
              <motion.div key={p.product_id} variants={cardFade}>
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
          {hasMore && (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2.5 rounded-xl border border-stroke bg-card px-8 py-3 text-sm font-semibold text-ink2 shadow-sm transition-all hover:border-edge hover:bg-raised hover:shadow-md disabled:opacity-60"
              >
                {loadingMore ? (
                  <>
                    <svg className="size-4 animate-spin text-ink3" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Loading…
                  </>
                ) : (
                  <>Load more products <ArrowRightIcon className="size-4 rotate-90" /></>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </motion.section>
  );
}

