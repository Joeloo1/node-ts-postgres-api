import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { queryKeys } from "../lib/queryKeys";
import * as productService from "../services/products";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid } from "../components/ProductSkeleton";
import { StarIcon } from "../components/Icons";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

export function BestSellersPage() {
  usePageTitle("Best Sellers");

  const { data, isPending } = useQuery({
    queryKey: queryKeys.bestSellers(),
    queryFn: () => productService.getProducts({ sortBy: "rating", order: "desc", limit: 24 }),
    staleTime: 5 * 60_000,
  });

  const products = data?.products ?? [];

  return (
    <>
      <Helmet>
        <title>Best Sellers — Northline</title>
        <meta name="description" content="Shop Northline's best-selling products. Top-rated items loved by thousands of customers." />
        <meta property="og:title" content="Best Sellers — Northline" />
        <meta property="og:description" content="Top-rated products loved by thousands of Northline customers." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>

      <div className="space-y-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[12px] text-ink4">
            <li><Link to="/" className="transition-colors hover:text-ink">Home</Link></li>
            <li>/</li>
            <li className="font-medium text-ink">Best Sellers</li>
          </ol>
        </nav>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
              <StarIcon className="size-6" filled />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Trending now</p>
              <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Best Sellers</h1>
            </div>
          </div>
          <p className="max-w-xl text-[15px] leading-relaxed text-ink3">
            Our most loved products, ranked by customer ratings and reviews. These are the items
            our shoppers keep coming back for.
          </p>

          {/* Trust signals */}
          <div className="flex flex-wrap gap-3">
            {[
              "Verified customer ratings",
              "Free shipping $50+",
              "30-day returns",
            ].map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-raised px-3 py-1 text-[12px] font-medium text-ink3"
              >
                <span className="size-1.5 rounded-full bg-emerald-500" />
                {badge}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Grid */}
        {isPending ? (
          <ProductSkeletonGrid count={12} />
        ) : products.length === 0 ? (
          <p className="py-20 text-center text-ink4">No products available right now.</p>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {products.map((p, i) => {
              const rank = [
                { bg: "bg-gradient-to-br from-amber-400 to-amber-600", shadow: "shadow-amber-500/40", label: "🥇" },
                { bg: "bg-gradient-to-br from-slate-300 to-slate-500",  shadow: "shadow-slate-400/40",  label: "🥈" },
                { bg: "bg-gradient-to-br from-amber-600 to-amber-800",  shadow: "shadow-amber-700/40",  label: "🥉" },
              ][i];
              return (
                <motion.div key={p.product_id} variants={item} className="relative">
                  {i < 3 && (
                    <div className={`absolute -right-2 -top-2 z-10 flex size-8 items-center justify-center rounded-full text-sm shadow-lg ring-2 ring-card ${rank.bg} ${rank.shadow}`}>
                      {rank.label}
                    </div>
                  )}
                  {i < 3 && (
                    <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-amber-500/20" />
                  )}
                  <ProductCard product={p} />
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </>
  );
}
