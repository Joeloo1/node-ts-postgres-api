import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
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
import { useCountUp } from "../hooks/useCountUp";
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
      <div className={`w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center ${className ?? ""}`}>
        <svg className="size-8 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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
  { Icon: StarIcon,    title: "Top-rated",        desc: "4.9 from 2,400+ reviews" },
];

const statsConfig = [
  { target: 10000, label: "Products",          display: (n: number) => n >= 1000 ? `${(n / 1000).toFixed(0)}K+` : String(n) },
  { target: 50,    label: "Brands",            display: (n: number) => `${n}+` },
  { target: 2400,  label: "5-star reviews",    display: (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K+` : String(n) },
  { target: 99,    label: "Satisfaction rate", display: (n: number) => `${n}%` },
];

const HOW_IT_WORKS = [
  {
    title: "Browse & discover",
    desc: "Explore 10,000+ curated products across every category — from electronics to everyday essentials.",
    icon: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z",
  },
  {
    title: "Checkout securely",
    desc: "Pay with confidence using 256-bit SSL encryption and your choice of payment method.",
    icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  },
  {
    title: "Fast delivery",
    desc: "Orders ship within 24 hours. Track in real-time and enjoy free returns within 30 days.",
    icon: "M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12",
  },
];

const TESTIMONIALS = [
  {
    quote: "I've been ordering from Northline for over a year. The quality is genuinely better than what I find in stores, and shipping is always faster than expected.",
    author: "Sarah M.",
    role: "Verified buyer",
    initials: "SM",
    colorClass: "bg-emerald-500",
  },
  {
    quote: "The return process was completely painless — I emailed support and had a refund within two days. Customer service at this level is rare for an online store.",
    author: "James T.",
    role: "Verified buyer",
    initials: "JT",
    colorClass: "bg-teal-500",
  },
  {
    quote: "Found exactly what I needed in the Home & Kitchen section. The descriptions are honest — no surprises when it arrived. Will absolutely shop here again.",
    author: "Priya K.",
    role: "Verified buyer",
    initials: "PK",
    colorClass: "bg-cyan-600",
  },
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

  const { products: recentlyViewed, hasAny: hasRecentlyViewed } = useRecentlyViewed();

  return (
    <div className="space-y-20 sm:space-y-24">

      {/* ══ HERO ══════════════════════════════════════════════ */}
      <section className="relative -mx-4 -mt-8 overflow-hidden sm:-mx-6 lg:-mx-8">
        <div
          className="absolute inset-y-0 right-0 hidden w-[48%] lg:block"
          style={{ background: "linear-gradient(160deg, #0a1f12 0%, #040f08 100%)" }}
        >
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          <div className="absolute -bottom-32 -right-32 size-[500px] rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="absolute -top-16 right-1/2 size-72 rounded-full bg-teal-400/8 blur-3xl" />
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
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400">Premium collection 2025</span>
              </motion.div>

              <div className="space-y-2">
                <h1 className="font-display text-[3.4rem] font-bold leading-[0.96] tracking-[-0.035em] text-ink sm:text-[4.5rem] lg:text-[4.8rem] xl:text-[5.5rem]">
                  Quality goods,
                  <br />
                  <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
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
                  className="group inline-flex items-center gap-2.5 rounded-xl bg-emerald-600 px-7 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/35 active:scale-[0.97]"
                >
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

              <div className="flex items-center gap-5 pt-1">
                <div className="flex -space-x-2.5">
                  {[
                    { letter: "E", color: "bg-emerald-500" },
                    { letter: "M", color: "bg-teal-500" },
                    { letter: "S", color: "bg-cyan-500" },
                    { letter: "A", color: "bg-emerald-700" },
                  ].map(({ letter, color }, i) => (
                    <div key={i} className={`flex size-8 items-center justify-center rounded-full border-2 border-page text-[10px] font-bold text-white ${color}`}>
                      {letter}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map((s) => <StarIcon key={s} className="size-3 text-amber-400" filled />)}
                    <span className="ml-1.5 text-sm font-bold text-ink">4.9</span>
                  </div>
                  <p className="text-[11px] text-ink4">from 2,400+ verified reviews</p>
                </div>
                <div className="h-8 w-px bg-stroke" />
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

              {/* Floating "order delivered" notification */}
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="absolute -bottom-4 -left-4 hidden lg:flex items-center gap-3 rounded-2xl border border-stroke bg-card px-4 py-3 shadow-xl shadow-black/15"
              >
                <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
                  <PackageIcon className="size-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-ink">Order delivered!</p>
                  <p className="text-[11px] text-ink4">2 min ago · 4.9 ★ review</p>
                </div>
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              </motion.div>
            </motion.div>

          </div>
        </div>
      </section>

      {/* ══ BRAND STRIP ══════════════════════════════════════ */}
      <BrandStrip />

      {/* ══ TRUST BADGES ═════════════════════════════════════ */}
      <motion.div
        variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-2 gap-4 border-y border-stroke py-8 sm:py-10 lg:grid-cols-4"
      >
        {trustItems.map(({ Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-400">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-[12px] text-ink4 leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ══ CATEGORIES ═══════════════════════════════════════ */}
      <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Collections</p>
            <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Shop by category</h2>
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
                    <div className={`flex size-9 items-center justify-center rounded-xl ${g.iconBgClass}`}>
                      <CategoryIcon name={cat.name} className={`size-4 ${g.textClass}`} />
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
                      <div className={`relative flex size-10 items-center justify-center rounded-xl ${g.iconBgClass}`}>
                        <CategoryIcon name={cat.name} className={`size-5 ${g.textClass}`} />
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
            <div className="mb-1 flex flex-col items-end gap-2.5">
              <DealsCountdown />
              <Link
                to="/products"
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
          <div>
            <div className="flex items-center gap-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">Top picks</p>
              <span className="rounded-full bg-amber-500/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                🏆 Best sellers
              </span>
            </div>
            <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Most popular</h2>
            <p className="mt-1 text-[13px] text-ink4">Our highest-rated products, loved by thousands.</p>
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
          <div>
            <div className="flex items-center gap-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Just dropped</p>
              <span className="rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">New</span>
            </div>
            <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">New arrivals</h2>
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

      {/* ══ HOW IT WORKS ═════════════════════════════════════ */}
      <HowItWorksSection />

      {/* ══ TESTIMONIALS ═════════════════════════════════════ */}
      <TestimonialsSection />

      {/* ══ RECENTLY VIEWED ══════════════════════════════════ */}
      {hasRecentlyViewed && recentlyViewed.length > 0 && (
        <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Your history</p>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Recently viewed</h2>
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

      {/* ══ STATS ════════════════════════════════════════════ */}
      <StatsSection />

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
          <h2 className="mx-auto mt-3 max-w-lg font-display text-3xl font-bold leading-[1.12] text-white sm:text-4xl lg:text-[2.6rem]">
            Every order. Every time.
            <br />
            <span className="text-emerald-300">Delivered right.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-emerald-100/50">
            Thousands of customers trust Northline for quality essentials, fast shipping, and honest pricing.
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

      {/* ══ NEWSLETTER ═══════════════════════════════════════ */}
      <NewsletterSection />
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
      className="flex w-full max-w-md items-center gap-2 rounded-xl border border-stroke bg-card p-1.5 shadow-sm transition-shadow focus-within:border-emerald-500/40 focus-within:shadow-md"
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

function BrandStrip() {
  const brandsWithDots = BRANDS.reduce<Array<{ type: "brand" | "dot"; value: string }>>((acc, brand, i) => {
    acc.push({ type: "brand", value: brand });
    if (i < BRANDS.length - 1) acc.push({ type: "dot", value: `dot-${i}` });
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
          <h2 className="font-display text-3xl font-bold leading-[1.1] text-white sm:text-4xl">
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
            <p className="text-[12px] text-white/40 mb-1">Members save up to</p>
            <p className="font-display text-4xl font-bold text-white">30<span className="text-emerald-400">%</span></p>
            <p className="mt-1 text-[12px] text-white/40">on every order</p>
          </div>
          <Link
            to="/products"
            className="group/btn inline-flex items-center gap-2.5 rounded-xl bg-emerald-500 px-7 py-3.5 text-[14px] font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 active:scale-[0.98]"
          >
            Shop the collection
            <ArrowRightIcon className="size-4 transition-transform group-hover/btn:translate-x-0.5" />
          </Link>
          <Link to="/register" className="text-center text-[12px] text-white/40 transition-colors hover:text-white/70">
            No account needed →
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

function HowItWorksSection() {
  return (
    <motion.section
      variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
      className="relative overflow-hidden rounded-3xl border border-stroke bg-card px-8 py-14 sm:px-12 sm:py-16"
    >
      <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(var(--color-stroke) 1px, transparent 1px), linear-gradient(90deg, var(--color-stroke) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="relative">
        <div className="mb-14 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Simple process</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Shopping made easy</h2>
          <p className="mt-2 mx-auto max-w-sm text-[14px] text-ink4">Three steps from browsing to your doorstep.</p>
        </div>
        <div className="relative grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
          <div className="absolute top-8 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] hidden h-px border-t-2 border-dashed border-stroke sm:block" />
          {HOW_IT_WORKS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.42, delay: i * 0.13 }}
              className="relative flex flex-col items-center gap-5 text-center"
            >
              <div className="relative z-10 flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 ring-4 ring-card dark:bg-emerald-500/15 dark:text-emerald-400">
                <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                </svg>
                <span className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-[9px] font-bold text-white shadow-md">
                  {i + 1}
                </span>
              </div>
              <div className="max-w-[220px]">
                <h3 className="font-display text-[16px] font-semibold text-ink">{item.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-ink4">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
        <div className="mt-12 flex justify-center">
          <Link
            to="/products"
            className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-600 px-7 py-3 text-[13px] font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-500 active:scale-[0.98]"
          >
            Start shopping <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>
    </motion.section>
  );
}

function TestimonialsSection() {
  return (
    <motion.section variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Reviews</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">What customers say</h2>
        </div>
        <div className="mb-1 flex items-center gap-2 rounded-full border border-stroke bg-card px-4 py-2">
          <div className="flex items-center gap-0.5">
            {[1,2,3,4,5].map((s) => <StarIcon key={s} className="size-3 text-amber-400" filled />)}
          </div>
          <span className="text-[13px] font-semibold text-ink">4.9</span>
          <span className="text-[12px] text-ink4">/ 2,400+ reviews</span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.author}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="flex flex-col justify-between rounded-2xl border border-stroke bg-card p-6 gap-5 transition-all duration-300 hover:border-edge hover:shadow-xl hover:shadow-black/6"
          >
            <div>
              <div className="flex items-center gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, s) => <StarIcon key={s} className="size-3.5 text-amber-400" filled />)}
              </div>
              <div className="relative">
                <span className="absolute -left-1 -top-2 font-serif text-5xl leading-none text-emerald-500/20 select-none">"</span>
                <p className="relative pl-3 text-[13.5px] leading-[1.72] text-ink3">{t.quote}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-stroke pt-4">
              <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${t.colorClass} text-[11px] font-bold text-white`}>
                {t.initials}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-ink">{t.author}</p>
                <p className="text-[11px] text-ink4">{t.role}</p>
              </div>
              <div className="ml-auto flex size-5 items-center justify-center rounded-full bg-emerald-500/15">
                <svg className="size-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
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

function StatCounter({ target, display, label }: { target: number; display: (n: number) => string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const count = useCountUp(target, 1600, active);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setActive(true); observer.disconnect(); } },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center justify-center gap-2 px-6 py-14 sm:py-16">
      <span className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">
        {active ? display(count) : display(0)}
      </span>
      <span className="text-[12px] font-medium uppercase tracking-widest text-emerald-400/60">{label}</span>
    </div>
  );
}

function StatsSection() {
  return (
    <motion.section
      variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
      className="relative overflow-hidden rounded-3xl"
      style={{ background: "linear-gradient(160deg, #080807 0%, #0e110d 60%, #081209 100%)" }}
    >
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative">
        <div className="border-b border-white/[0.06] px-8 py-8 text-center sm:px-12">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400/60">By the numbers</p>
          <h2 className="mt-1.5 font-display text-2xl font-bold text-white sm:text-3xl">Northline at a glance</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4">
          {statsConfig.map((s, i) => (
            <div
              key={s.label}
              className={[
                i % 2 === 0 && i < 2 ? "border-b border-white/[0.06] lg:border-b-0" : "",
                i < 3 ? "lg:border-r lg:border-white/[0.06]" : "",
                i % 2 === 0 ? "border-r border-white/[0.06]" : "",
              ].join(" ")}
            >
              <StatCounter target={s.target} display={s.display} label={s.label} />
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); }, 900);
  }

  return (
    <motion.section
      variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
      className="overflow-hidden rounded-3xl border border-stroke bg-card"
    >
      {submitted ? (
        <div className="flex flex-col items-center justify-center gap-3 px-8 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-500">
            <svg className="size-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="font-display text-xl font-bold text-ink">You're on the list!</h2>
          <p className="text-sm text-ink4">We'll be in touch with the best deals and new arrivals.</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_1px_1fr]">
          <div className="px-8 py-10 sm:px-12 lg:py-12">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Newsletter</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Stay in the loop</h2>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-ink3">
              New arrivals, exclusive deals, and curated picks — straight to your inbox.
            </p>
            <ul className="mt-5 space-y-2.5">
              {["Weekly new arrivals", "Members-only discounts", "No spam, ever"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[13px] text-ink3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                    <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden w-px bg-stroke lg:block" />
          <div className="flex flex-col justify-center border-t border-stroke px-8 py-10 sm:px-12 lg:border-t-0 lg:py-12">
            <h3 className="text-sm font-semibold text-ink">Subscribe for free</h3>
            <p className="mt-1 text-xs text-ink4">Join 3,000+ subscribers. Unsubscribe any time.</p>
            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-stroke bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15"
              />
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.99] disabled:opacity-70"
              >
                {loading && (
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                {loading ? "Subscribing…" : "Subscribe"}
              </button>
            </form>
            <p className="mt-3 text-[11px] text-ink4">
              By subscribing you agree to our{" "}
              <Link to="/privacy" className="underline underline-offset-2 hover:text-ink3">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      )}
    </motion.section>
  );
}
