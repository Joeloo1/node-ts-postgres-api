import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid } from "../components/ProductSkeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import { productImageUrl } from "../lib/productImage";
import type { Category, Product } from "../lib/types";
import { ArrowRightIcon, TruckIcon, ShieldIcon, PackageIcon, StarIcon } from "../components/Icons";

type ProductsRes = { status: string; data: { products: Product[] } };
type CategoriesRes = { status: string; data: { categories: Category[] } };

/* ── Animation presets ─────────────────────────── */
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.48, ease: [0.25, 0.1, 0.25, 1] } },
};
const stagger: Variants = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.055 } },
};
const cardFade: Variants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.25, 0.1, 0.25, 1] } },
};

/* ── Category icon map ─────────────────────────── */
function CategoryIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    "Electronics":        "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
    "Home & Kitchen":     "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
    "Fashion":            "M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z",
    "Sports & Outdoors":  "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z",
    "Beauty":             "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z",
    "Books & Media":      "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
    "Toys & Games":       "M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z",
    "Garden & Tools":     "M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18",
    "Office":             "M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z",
    "Groceries & Pantry": "M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z",
  };
  const d = paths[name];
  if (!d) return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
    </svg>
  );
  return (
    <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d={d} />
    </svg>
  );
}

/* ── Trust strip items ─────────────────────────── */
const trustItems = [
  { Icon: TruckIcon,   title: "Free shipping",     desc: "On all orders over $50" },
  { Icon: PackageIcon, title: "Easy returns",       desc: "30-day hassle-free policy" },
  { Icon: ShieldIcon,  title: "Secure checkout",   desc: "256-bit SSL encryption" },
  { Icon: StarIcon,    title: "Top-rated",          desc: "4.9 from 2,400+ reviews" },
];

/* ── Stats ─────────────────────────────────────── */
const stats = [
  { value: "10K+",  label: "Products" },
  { value: "50+",   label: "Brands" },
  { value: "2.4K+", label: "5-star reviews" },
  { value: "99%",   label: "Satisfaction rate" },
];

/* ═══════════════════════════════════════════════ */
export function HomePage() {
  usePageTitle("Shop");
  const { token } = useAuth();
  const isSignedIn = Boolean(token);

  const { data: products, isPending } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const res = await apiFetch<ProductsRes>("/api/v1/products?limit=8&sortBy=createdAt&order=desc");
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
    <div className="space-y-24 sm:space-y-28">

      {/* ════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════ */}
      <section className="relative grid items-center gap-12 py-8 sm:py-12 lg:grid-cols-[1fr_460px] lg:gap-16 lg:py-16 xl:grid-cols-[1fr_500px]">

        {/* Text column */}
        <motion.div
          className="space-y-7"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {/* Announcement pill */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
          >
            <Link
              to="/products"
              className="group inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/8 px-4 py-1.5 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-500/12 dark:text-emerald-400"
            >
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
              Free shipping on orders over $50
              <ArrowRightIcon className="size-3 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="font-display text-[3.2rem] font-bold leading-[1.04] tracking-[-0.03em] text-ink sm:text-6xl lg:text-[4rem] xl:text-[4.5rem]">
              Quality goods,
              <br />
              <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-300">
                thoughtfully curated.
              </span>
            </h1>
            <p className="max-w-[460px] text-[17px] leading-[1.7] text-ink3">
              From electronics to everyday essentials — honest pricing, seamless checkout, and products worth keeping.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/products"
              className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-600 px-6 py-3 text-[14px] font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:shadow-emerald-500/30 active:scale-[0.98]"
            >
              Shop now
              <ArrowRightIcon className="size-4" />
            </Link>
            {!isSignedIn && (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-card px-6 py-3 text-[14px] font-semibold text-ink2 transition-all hover:bg-raised hover:border-edge active:scale-[0.98]"
              >
                Create account
              </Link>
            )}
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-4 pt-1">
            {/* Stacked avatar circles */}
            <div className="flex -space-x-2.5">
              {["E", "M", "S", "A"].map((letter, i) => (
                <div
                  key={i}
                  className={`flex size-8 items-center justify-center rounded-full border-2 border-page text-[11px] font-bold text-white ring-0 ${
                    ["bg-emerald-500", "bg-teal-500", "bg-cyan-500", "bg-emerald-700"][i]
                  }`}
                >
                  {letter}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((s) => (
                  <StarIcon key={s} className="size-3 text-amber-400" filled />
                ))}
                <span className="ml-1 text-sm font-semibold text-ink">4.9</span>
              </div>
              <p className="text-[12px] text-ink4">from 2,400+ verified reviews</p>
            </div>
          </div>
        </motion.div>

        {/* Product mosaic — desktop */}
        <motion.div
          className="hidden lg:grid grid-cols-2 gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: [0.25, 0.1, 0.25, 1] }}
        >
          {isPending || !products?.length
            ? [0, 1, 2, 3].map((i) => (
                <div key={i} className={`aspect-[3/4] animate-shimmer rounded-2xl bg-raised ${i % 2 === 1 ? "mt-10" : ""}`} />
              ))
            : products.slice(0, 4).map((p, i) => (
                <Link
                  key={p.product_id}
                  to={`/products/${p.product_id}`}
                  className={`group relative block overflow-hidden rounded-2xl bg-raised ${i % 2 === 1 ? "mt-10" : ""}`}
                >
                  <img
                    src={productImageUrl(p)}
                    alt={p.name}
                    className="aspect-[3/4] w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                    loading="eager"
                  />
                  {/* Price card — slides up on hover */}
                  <div className="absolute inset-x-2 bottom-2 translate-y-1 rounded-xl border border-white/10 bg-black/60 px-3 py-2.5 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                    <p className="truncate text-[11px] font-medium text-white/80">{p.name}</p>
                    <p className="mt-0.5 text-sm font-bold text-white">
                      ${(p.discount ? p.price * (1 - p.discount / 100) : p.price).toFixed(2)}
                    </p>
                  </div>
                  {/* New badge */}
                  {i === 0 && (
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-bold text-ink backdrop-blur-sm">
                      NEW
                    </span>
                  )}
                </Link>
              ))}
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════
          TRUST STRIP
      ════════════════════════════════════════════ */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="grid grid-cols-2 gap-3 border-y border-stroke py-8 sm:py-10 lg:grid-cols-4"
      >
        {trustItems.map(({ Icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 sm:items-center">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Icon className="size-4.5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{title}</p>
              <p className="mt-0.5 text-[12px] text-ink4 leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ════════════════════════════════════════════
          CATEGORIES
      ════════════════════════════════════════════ */}
      {categories && categories.length > 0 && (
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-40px" }}
        >
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Browse</p>
              <h2 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">
                Shop by category
              </h2>
            </div>
            <Link
              to="/products"
              className="group mb-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink3 transition-all hover:border-edge hover:text-ink"
            >
              View all
              <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categories.map((cat, idx) => (
              <motion.div
                key={cat.category_id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
              >
                <Link
                  to={`/products?category_id=${cat.category_id}`}
                  className="group flex flex-col gap-3 overflow-hidden rounded-2xl border border-stroke bg-card p-4 transition-all duration-250 hover:border-emerald-500/30 hover:bg-raised hover:shadow-md hover:shadow-black/5"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-raised text-ink3 transition-all duration-250 group-hover:bg-emerald-500/12 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    <CategoryIcon name={cat.name} />
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[13px] font-medium text-ink2 transition-colors group-hover:text-ink">
                      {cat.name}
                    </span>
                    <ArrowRightIcon className="size-3 shrink-0 translate-x-[-2px] text-ink4 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}

      {/* ════════════════════════════════════════════
          NEW ARRIVALS
      ════════════════════════════════════════════ */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
      >
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
            View all
            <ArrowRightIcon className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {isPending ? (
          <ProductSkeletonGrid count={8} />
        ) : (
          <motion.div
            className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
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

      {/* ════════════════════════════════════════════
          STATS
      ════════════════════════════════════════════ */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="overflow-hidden rounded-3xl border border-stroke bg-card"
      >
        <div className="grid grid-cols-2 divide-x divide-y divide-stroke lg:grid-cols-4 lg:divide-y-0">
          {stats.map(({ value, label }) => (
            <div key={label} className="flex flex-col items-center justify-center gap-1 px-6 py-10">
              <span className="font-display text-3xl font-bold text-ink sm:text-4xl">{value}</span>
              <span className="text-[13px] text-ink4">{label}</span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ════════════════════════════════════════════
          CTA BANNER
      ════════════════════════════════════════════ */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="relative overflow-hidden rounded-3xl"
        style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 45%, #0f172a 100%)" }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "26px 26px" }}
        />
        {/* Glows */}
        <div className="absolute -left-24 -top-24 size-[400px] rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 size-72 rounded-full bg-teal-400/12 blur-3xl" />
        <div className="absolute left-1/2 top-0 h-px w-1/2 bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />

        <div className="relative px-8 py-16 text-center sm:px-16 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400/70">
            Join the community
          </p>
          <h2 className="mx-auto mt-3 max-w-lg font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-[2.6rem]">
            Ready to discover something you'll love?
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-emerald-100/55">
            Thousands of customers trust Northline for quality essentials, fast shipping, and honest pricing.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/products"
              className="inline-flex items-center gap-2.5 rounded-xl bg-white px-7 py-3 text-[14px] font-semibold text-emerald-900 shadow-xl shadow-black/20 transition-all hover:bg-emerald-50 active:scale-[0.98]"
            >
              Browse the catalog
              <ArrowRightIcon className="size-4" />
            </Link>
            {!isSignedIn && (
              <Link
                to="/register"
                className="inline-flex items-center gap-2.5 rounded-xl border border-white/20 bg-white/10 px-7 py-3 text-[14px] font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15 active:scale-[0.98]"
              >
                Create free account
              </Link>
            )}
          </div>
          {/* Trust line */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
            {["Free shipping over $50", "30-day returns", "Secure checkout"].map((t) => (
              <span key={t} className="flex items-center gap-1.5 text-[12px] text-emerald-200/50">
                <span className="size-1 rounded-full bg-emerald-400/50" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ════════════════════════════════════════════
          NEWSLETTER
      ════════════════════════════════════════════ */}
      <NewsletterSection />

    </div>
  );
}

/* ── Newsletter ────────────────────────────────── */
function NewsletterSection() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  }

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
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
          {/* Left — text */}
          <div className="px-8 py-10 sm:px-12 lg:py-12">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Newsletter
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
              Stay in the loop
            </h2>
            <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-ink3">
              New arrivals, exclusive deals, and curated picks — straight to your inbox.
            </p>
            <ul className="mt-5 space-y-2">
              {["Weekly new arrivals", "Members-only discounts", "No spam, ever"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-[13px] text-ink3">
                  <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                    <svg className="size-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Vertical divider */}
          <div className="hidden w-px bg-stroke lg:block" />

          {/* Right — form */}
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
                className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 active:scale-[0.99]"
              >
                Subscribe
              </button>
            </form>
            <p className="mt-3 text-[11px] text-ink4">
              By subscribing you agree to our{" "}
              <a href="/privacy" className="underline underline-offset-2 hover:text-ink3">Privacy Policy</a>.
            </p>
          </div>
        </div>
      )}
    </motion.section>
  );
}
