import { useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { useWishlist } from "../context/WishlistContext";
import { usePageTitle } from "../hooks/usePageTitle";
import { apiFetch } from "../lib/api";
import { ProductCard } from "../components/ProductCard";
import { ProductSkeleton } from "../components/ProductSkeleton";
import { HeartIcon } from "../components/Icons";
import type { Product } from "../lib/types";

type ProductRes = { status: string; data: { product: Product } };

const container: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, ease: [0.25, 0.1, 0.25, 1] },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

export function WishlistPage() {
  usePageTitle("Wishlist");
  const { wishlist, toggle } = useWishlist();
  const ids = [...wishlist];

  const productQueries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["product", id],
      queryFn: async () => {
        const res = await apiFetch<ProductRes>(`/api/v1/products/${id}`);
        return res.data.product;
      },
      staleTime: 60_000,
    })),
  });

  const isLoading = productQueries.some((q) => q.isPending);
  const products = productQueries.map((q) => q.data).filter(Boolean) as Product[];

  if (ids.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 text-center">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-zinc-900 border border-zinc-800">
          <HeartIcon className="size-9 text-zinc-600" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Your wishlist is empty</h1>
          <p className="mt-2 text-zinc-500">Save items you love and come back to them anytime.</p>
        </div>
        <Link
          to="/products"
          className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Wishlist</h1>
          <p className="mt-1 text-zinc-500">{ids.length} saved {ids.length === 1 ? "item" : "items"}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Clear your entire wishlist?")) {
              ids.forEach((id) => toggle(id));
            }
          }}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
        >
          Clear all
        </button>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ids.map((id) => <ProductSkeleton key={id} />)}
        </div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {products.map((product) => (
            <motion.div key={product.product_id} variants={item}>
              <ProductCard product={product} />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
