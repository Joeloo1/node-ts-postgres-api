import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid } from "../components/ProductSkeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import type { Category, Product } from "../lib/types";
import {
  ArrowRightIcon,
  PackageIcon,
  PhoneIcon,
  ShieldIcon,
  TruckIcon,
} from "../components/Icons";

type ProductsRes = { status: string; data: { products: Product[] } };
type CategoriesRes = { status: string; data: { categories: Category[] } };

const trustBadges = [
  { icon: TruckIcon, title: "Free shipping", desc: "On orders over $50" },
  { icon: PackageIcon, title: "Easy returns", desc: "30-day return policy" },
  { icon: ShieldIcon, title: "Secure checkout", desc: "256-bit SSL encrypted" },
  { icon: PhoneIcon, title: "24/7 Support", desc: "Always here to help" },
];

const categoryVisuals: Record<string, { emoji: string; from: string; ring: string; accent: string }> = {
  "Electronics":        { emoji: "⚡", from: "from-blue-950/80",    ring: "ring-blue-800/40",    accent: "bg-blue-500/10 text-blue-400" },
  "Home & Kitchen":     { emoji: "🏠", from: "from-amber-950/80",   ring: "ring-amber-800/40",   accent: "bg-amber-500/10 text-amber-400" },
  "Fashion":            { emoji: "👗", from: "from-pink-950/80",    ring: "ring-pink-800/40",    accent: "bg-pink-500/10 text-pink-400" },
  "Sports & Outdoors":  { emoji: "🏔️", from: "from-emerald-950/80", ring: "ring-emerald-800/40", accent: "bg-emerald-500/10 text-emerald-400" },
  "Beauty":             { emoji: "✨", from: "from-purple-950/80",  ring: "ring-purple-800/40",  accent: "bg-purple-500/10 text-purple-400" },
  "Books & Media":      { emoji: "📚", from: "from-zinc-900/80",    ring: "ring-zinc-700/40",    accent: "bg-zinc-500/10 text-zinc-400" },
  "Toys & Games":       { emoji: "🎮", from: "from-yellow-950/80",  ring: "ring-yellow-800/40",  accent: "bg-yellow-500/10 text-yellow-400" },
  "Garden & Tools":     { emoji: "🌿", from: "from-green-950/80",   ring: "ring-green-800/40",   accent: "bg-green-500/10 text-green-400" },
  "Office":             { emoji: "💼", from: "from-slate-900/80",   ring: "ring-slate-700/40",   accent: "bg-slate-500/10 text-slate-400" },
  "Groceries & Pantry": { emoji: "🛒", from: "from-lime-950/80",    ring: "ring-lime-800/40",    accent: "bg-lime-500/10 text-lime-400" },
};

const heroFloatCards = [
  { emoji: "⚡", name: "Electronics", gradient: "from-blue-500/15 to-blue-500/5", border: "border-blue-500/20", delay: 0 },
  { emoji: "👗", name: "Fashion",     gradient: "from-pink-500/15 to-pink-500/5", border: "border-pink-500/20", delay: 0.12 },
  { emoji: "🏠", name: "Home",        gradient: "from-amber-500/15 to-amber-500/5", border: "border-amber-500/20", delay: 0.24 },
  { emoji: "✨", name: "Beauty",      gradient: "from-purple-500/15 to-purple-500/5", border: "border-purple-500/20", delay: 0.36 },
];

const stats = [
  { value: "72+",   label: "Products" },
  { value: "10",    label: "Categories" },
  { value: "4.7★",  label: "Avg rating" },
  { value: "Free",  label: "Returns" },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const cardFade: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

export function HomePage() {
  usePageTitle("Shop");
  const { token } = useAuth();
  const isSignedIn = Boolean(token);

  const { data: products, isPending, isError } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const res = await apiFetch<ProductsRes>(
        "/api/v1/products?limit=8&sortBy=createdAt&order=desc",
      );
      return res.data.products;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiFetch<CategoriesRes>("/api/v1/categories");
      return res.data.categories;
    },
  });

  return (
    <div className="space-y-20 sm:space-y-28">

      {/* ── Hero ────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" />
        <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_60%_80%_at_100%_50%,rgba(16,185,129,0.08),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "28px 28px" }}
        />

        <div className="relative px-6 py-16 sm:px-12 sm:py-24 lg:px-16 lg:py-28">
          <div className="flex flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">

            {/* Left — text content */}
            <motion.div
              className="flex-1 space-y-6 sm:space-y-7"
              initial="hidden"
              animate="show"
              variants={stagger}
            >
              <motion.div variants={cardFade} className="inline-flex items-center gap-2.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-1.5">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                  New arrivals daily
                </span>
              </motion.div>

              <motion.h1 variants={cardFade} className="font-display text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
                <span className="text-white">Quality goods,</span>
                <br />
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300 bg-clip-text text-transparent">
                  thoughtfully curated.
                </span>
              </motion.h1>

              <motion.p variants={cardFade} className="max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
                Discover essentials from electronics to everyday items — honest
                pricing, seamless checkout, and products worth keeping.
              </motion.p>

              <motion.div variants={cardFade} className="flex flex-wrap gap-3 pt-1">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:gap-3 hover:shadow-emerald-500/30 active:scale-[0.97]"
                >
                  Shop now
                  <ArrowRightIcon className="size-4" />
                </Link>
                {!isSignedIn && (
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-semibold text-zinc-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.97]"
                  >
                    Create account
                  </Link>
                )}
              </motion.div>

              <motion.div variants={cardFade} className="flex flex-wrap items-center gap-5 pt-1 text-xs text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <span className="text-amber-400">★★★★★</span>
                  <span>4.9 / 5 from 2,300+ reviews</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {["J", "A", "M", "S"].map((l) => (
                      <div key={l} className="flex size-6 items-center justify-center rounded-full bg-zinc-700 text-[9px] font-bold text-zinc-300 ring-1 ring-zinc-900">
                        {l}
                      </div>
                    ))}
                  </div>
                  <span>12k+ happy customers</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right — floating category cards (desktop only) */}
            <div className="hidden lg:block lg:w-80 xl:w-96">
              <div className="relative grid grid-cols-2 gap-3">
                {/* Glow blob */}
                <div className="absolute -inset-8 -z-10 rounded-full bg-emerald-500/10 blur-3xl animate-glow-pulse" />

                {heroFloatCards.map((card, i) => (
                  <motion.div
                    key={card.name}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + card.delay, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
                    className={`${i % 2 === 1 ? "mt-6" : ""}`}
                  >
                    <div
                      className={`rounded-2xl bg-gradient-to-br ${card.gradient} border ${card.border} p-5 backdrop-blur-sm ${
                        i === 0 ? "animate-float" :
                        i === 1 ? "animate-float-slow" :
                        i === 2 ? "animate-float-slower" :
                        "animate-float"
                      }`}
                      style={{ animationDelay: `${i * 0.4}s` }}
                    >
                      <span className="text-4xl">{card.emoji}</span>
                      <p className="mt-3 text-sm font-semibold text-zinc-200">{card.name}</p>
                      <div className="mt-3 space-y-1.5">
                        <div className="h-1.5 w-full rounded-full bg-white/10" />
                        <div className="h-1.5 w-2/3 rounded-full bg-white/7" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
      >
        {stats.map(({ value, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-1 rounded-2xl border border-stroke bg-card py-6 px-4 text-center transition-colors hover:border-edge hover:bg-raised"
          >
            <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{value}</p>
            <p className="text-xs text-ink4">{label}</p>
          </div>
        ))}
      </motion.section>

      {/* ── Trust badges ────────────────────────────── */}
      <motion.section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
      >
        {trustBadges.map(({ icon: Icon, title, desc }) => (
          <motion.div
            key={title}
            variants={cardFade}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-stroke bg-card p-5 text-center transition-all duration-300 hover:border-emerald-500/30 hover:bg-raised hover:shadow-lg hover:shadow-emerald-500/5"
          >
            <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-transform duration-300 group-hover:scale-110">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-xs text-ink4">{desc}</p>
            </div>
          </motion.div>
        ))}
      </motion.section>

      {/* ── Shop by category ─────────────────────────── */}
      {categories && categories.length > 0 && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-60px" }}
        >
          <div className="mb-7 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Browse</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">Shop by category</h2>
            </div>
            <Link
              to="/products"
              className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
            >
              View all
              <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <motion.div
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
          >
            {categories.map((cat) => {
              const v = categoryVisuals[cat.name] ?? { emoji: "🏷️", from: "from-zinc-900/80", ring: "ring-zinc-700/40", accent: "bg-zinc-500/10 text-zinc-400" };
              return (
                <motion.div key={cat.category_id} variants={cardFade}>
                  <Link
                    to={`/products?category_id=${cat.category_id}`}
                    className={`group relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-b ${v.from} to-zinc-950 ring-1 ${v.ring} p-4 sm:p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-black/40 active:scale-[0.98]`}
                  >
                    <span className="text-3xl sm:text-4xl">{v.emoji}</span>
                    <p className="mt-3 text-xs font-semibold text-zinc-300 group-hover:text-white transition-colors sm:text-sm">
                      {cat.name}
                    </p>
                    <div className="absolute -right-3 -top-3 text-5xl opacity-[0.07] transition-all duration-300 group-hover:scale-110 group-hover:opacity-[0.14] sm:text-6xl">
                      {v.emoji}
                    </div>
                    {/* Arrow on hover */}
                    <div className="mt-3 flex items-center gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100 translate-x-[-4px] group-hover:translate-x-0">
                      <span className="text-[10px] font-semibold text-emerald-400">Browse</span>
                      <ArrowRightIcon className="size-3 text-emerald-400" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.section>
      )}

      {/* ── New arrivals ─────────────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
      >
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400/80">Fresh stock</p>
            <h2 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">New arrivals</h2>
            <p className="mt-1 text-sm text-ink4">The latest additions to our catalog</p>
          </div>
          <Link
            to="/products"
            className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
          >
            View all
            <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {isPending ? (
          <ProductSkeletonGrid count={8} />
        ) : isError ? (
          <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center">
            <p className="text-sm text-red-300">Could not load products — is the API running?</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4"
            variants={stagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
          >
            {products?.map((p) => (
              <motion.div key={p.product_id} variants={cardFade}>
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.section>

      {/* ── CTA banner ──────────────────────────────── */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-60px" }}
        className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-emerald-900/30 bg-gradient-to-br from-emerald-950/70 via-zinc-950 to-zinc-950 px-6 py-14 text-center sm:px-14 sm:py-20"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_80%_at_50%_120%,rgba(16,185,129,0.12),transparent)]" />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />
        <div className="relative">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Ready to start shopping?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-zinc-400">
            Join thousands of customers who trust Northline for quality essentials.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isSignedIn ? (
              <Link
                to="/orders"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.97]"
              >
                View your orders
              </Link>
            ) : (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.97]"
              >
                Create free account
              </Link>
            )}
            <Link
              to="/products"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-sm font-semibold text-zinc-300 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-[0.97]"
            >
              Browse catalog
            </Link>
          </div>
        </div>
      </motion.section>

    </div>
  );
}
