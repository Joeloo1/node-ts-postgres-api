import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { queryKeys } from "../lib/queryKeys";
import * as productService from "../services/products";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid } from "../components/ProductSkeleton";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

export function NewArrivalsPage() {
  usePageTitle("New Arrivals");

  const { data, isPending } = useQuery({
    queryKey: queryKeys.products("new-arrivals"),
    queryFn: () => productService.getProducts({ sortBy: "createdAt", order: "desc", limit: 24 }),
    staleTime: 5 * 60_000,
  });

  const products = data?.products ?? [];

  return (
    <>
      <Helmet>
        <title>New Arrivals — Northline</title>
        <meta name="description" content="Discover the latest arrivals at Northline. Be the first to shop our newest products and collections." />
        <meta property="og:title" content="New Arrivals — Northline" />
        <meta property="og:description" content="Discover the latest arrivals at Northline." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>

      <div className="space-y-10">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-[12px] text-ink4">
            <li><Link to="/" className="transition-colors hover:text-ink">Home</Link></li>
            <li>/</li>
            <li className="font-medium text-ink">New Arrivals</li>
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
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Just dropped</p>
              <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">New Arrivals</h1>
            </div>
          </div>
          <p className="max-w-xl text-[15px] leading-relaxed text-ink3">
            Fresh products added to our catalogue. Be among the first to discover and shop our
            latest additions before they sell out.
          </p>

          <div className="flex flex-wrap gap-3">
            {["Updated weekly", "Free shipping $50+", "30-day returns"].map((badge) => (
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

        {isPending ? (
          <ProductSkeletonGrid count={12} />
        ) : products.length === 0 ? (
          <p className="py-20 text-center text-ink4">No new products at the moment — check back soon!</p>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {products.map((p) => (
              <motion.div key={p.product_id} variants={item}>
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </>
  );
}
