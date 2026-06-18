import { useQuery } from "@tanstack/react-query";
import { useParams, Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, type Variants } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { queryKeys } from "../lib/queryKeys";
import * as productService from "../services/products";
import * as categoryService from "../services/categories";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeletonGrid } from "../components/ProductSkeleton";
import { ChevronRightIcon, HomeIcon } from "../components/Icons";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

export function CategoryPage() {
  const { id } = useParams<{ id: string }>();

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoryService.getCategories,
    staleTime: 10 * 60_000,
  });

  const category = categories?.find((c) => String(c.category_id) === id);

  usePageTitle(category?.name ?? "Category");

  const { data, isPending } = useQuery({
    queryKey: queryKeys.products(`category-${id}`),
    queryFn: () => productService.getProducts({ category_id: id!, limit: 40 }),
    enabled: !!id,
    staleTime: 5 * 60_000,
  });

  const products = data?.products ?? [];

  if (!id) return <Navigate to="/products" replace />;

  return (
    <>
      <Helmet>
        <title>{category?.name ?? "Category"} — Northline</title>
        <meta name="description" content={`Shop ${category?.name ?? "products"} at Northline. Browse our full selection.`} />
        <meta property="og:title" content={`${category?.name ?? "Category"} — Northline`} />
        <meta property="og:description" content={`Shop ${category?.name ?? "products"} at Northline.`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>

      <div className="space-y-8">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-ink4">
          <Link to="/" className="flex items-center gap-1 hover:text-ink transition-colors">
            <HomeIcon className="size-3.5" />
            Home
          </Link>
          <ChevronRightIcon className="size-3" />
          <Link to="/products" className="hover:text-ink transition-colors">Products</Link>
          {category && (
            <>
              <ChevronRightIcon className="size-3" />
              <span className="text-ink">{category.name}</span>
            </>
          )}
        </nav>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3"
        >
          {/* Category hero banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 px-8 py-10 sm:px-12">
            <div className="absolute inset-0 opacity-5">
              <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
                <defs>
                  <pattern id="dots" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                    <circle cx="2" cy="2" r="1" fill="white" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>
            </div>
            <div className="relative">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-400">Browse category</p>
              <h1 className="mt-1 font-display text-3xl font-bold text-white sm:text-4xl">
                {category?.name ?? "Category"}
              </h1>
              {!isPending && (
                <p className="mt-2 text-sm text-zinc-400">
                  {products.length} product{products.length !== 1 ? "s" : ""} available
                </p>
              )}
            </div>
          </div>

          {/* Related categories */}
          {categories && categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <Link
                to="/products"
                className="shrink-0 rounded-full border border-stroke bg-card px-3.5 py-1.5 text-xs font-medium text-ink3 transition-colors hover:border-edge hover:text-ink"
              >
                All products
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.category_id}
                  to={`/categories/${c.category_id}`}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                    String(c.category_id) === id
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-stroke bg-card text-ink3 hover:border-edge hover:text-ink"
                  }`}
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
        </motion.div>

        {/* Products grid */}
        {isPending ? (
          <ProductSkeletonGrid count={12} />
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-semibold text-ink">No products in this category</p>
            <p className="mt-1 text-sm text-ink4">Check back soon or browse other categories.</p>
            <Link
              to="/products"
              className="mt-5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Browse all products
            </Link>
          </div>
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
