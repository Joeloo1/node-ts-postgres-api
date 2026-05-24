import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { productImageUrl } from "../lib/productImage";
import type { Product } from "../lib/types";
import { CartIcon, HeartIcon, StarIcon } from "./Icons";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";

export function ProductCard({ product }: { product: Product }) {
  const { token } = useAuth();
  const { toggle, has } = useWishlist();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isWishlisted = has(product.product_id);

  const categoryName =
    product.category && "name" in product.category ? product.category.name : null;
  const price =
    product.discount && product.discount > 0
      ? product.price * (1 - product.discount / 100)
      : product.price;

  const addToCart = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/cart/items", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ product_id: product.product_id, quantity: 1 }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Added to cart");
    },
    onError: () => toast.error("Could not add to cart"),
  });

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!token) { navigate("/login"); return; }
    addToCart.mutate();
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    toggle(product.product_id);
    toast(isWishlisted ? "Removed from wishlist" : "Saved to wishlist", {
      icon: isWishlisted ? "🗑️" : "❤️",
    });
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-stroke bg-card transition-all duration-300 hover:border-edge hover:bg-raised hover:shadow-xl hover:shadow-black/30">

      {/* Image */}
      <Link
        to={`/products/${product.product_id}`}
        className="relative aspect-square overflow-hidden bg-raised sm:aspect-[4/3]"
      >
        <img
          src={productImageUrl(product)}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.07]"
          loading="lazy"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/15" />

        {/* Out of stock */}
        {!product.availability && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
            <span className="rounded-full border border-zinc-500/40 bg-raised/80 px-3 py-1 text-xs font-semibold text-ink2">
              Out of stock
            </span>
          </div>
        )}

        {/* Discount badge */}
        {product.discount && product.discount > 0 ? (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-md">
            −{Math.round(product.discount)}%
          </span>
        ) : null}

        {/* Action buttons — always visible on mobile, hover-only on sm+ */}
        <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5
          sm:translate-x-2 sm:opacity-0 sm:transition-all sm:duration-200
          sm:group-hover:translate-x-0 sm:group-hover:opacity-100">
          <motion.button
            type="button"
            onClick={handleWishlist}
            whileTap={{ scale: 0.82 }}
            className={`flex size-8 items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-colors ${
              isWishlisted
                ? "bg-red-500 text-white"
                : "bg-page/80 text-ink3 hover:bg-red-500 hover:text-white"
            }`}
            aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          >
            <HeartIcon className="size-3.5" filled={isWishlisted} />
          </motion.button>

          {product.availability && (
            <motion.button
              type="button"
              onClick={handleAddToCart}
              disabled={addToCart.isPending}
              whileTap={{ scale: 0.82 }}
              className="flex size-8 items-center justify-center rounded-full bg-page/80 text-ink3 shadow-lg backdrop-blur-sm transition-colors hover:bg-emerald-600 hover:text-white disabled:opacity-50"
              aria-label="Add to cart"
            >
              <CartIcon className="size-3.5" />
            </motion.button>
          )}
        </div>

        {/* "View product" bar — slides up on hover (desktop), hidden on mobile */}
        {product.availability && (
          <div className="absolute bottom-2.5 left-2.5 right-2.5 hidden
            sm:block sm:translate-y-2 sm:opacity-0 sm:transition-all sm:duration-200
            sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
            <span className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-zinc-900 shadow-lg">
              View product
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        {categoryName ? (
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">
            {categoryName}
          </p>
        ) : null}

        <Link
          to={`/products/${product.product_id}`}
          className="line-clamp-2 font-display text-[13px] font-semibold leading-snug text-ink transition-colors hover:text-emerald-400 sm:text-[15px]"
        >
          {product.name}
        </Link>

        {product.brand ? (
          <p className="text-[11px] text-ink4 sm:text-xs">{product.brand}</p>
        ) : null}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-stroke pt-3">
          <div>
            <p className="text-sm font-bold tabular-nums text-ink sm:text-[15px]">
              ${price.toFixed(2)}
              {product.unit ? (
                <span className="text-xs font-normal text-ink4"> /{product.unit}</span>
              ) : null}
            </p>
            {product.discount && product.discount > 0 ? (
              <p className="text-[11px] text-ink4 line-through">${product.price.toFixed(2)}</p>
            ) : null}
          </div>

          {product.rating != null ? (
            <div className="flex items-center gap-1">
              <StarIcon className="size-3.5 text-amber-400" filled />
              <span className="text-[11px] font-semibold text-ink3 sm:text-xs">
                {product.rating.toFixed(1)}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
