import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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

  const discountedPrice =
    product.discount && product.discount > 0
      ? product.price * (1 - product.discount / 100)
      : null;

  const displayPrice = discountedPrice ?? product.price;
  const hasDiscount = discountedPrice !== null;

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
      toast.success(`${product.name.slice(0, 30)}${product.name.length > 30 ? "…" : ""} added to cart`, {
        action: { label: "View cart", onClick: () => navigate("/cart") },
      });
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
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-stroke bg-card transition-all duration-300 hover:border-edge hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/35">

      {/* ── Image ── */}
      <Link
        to={`/products/${product.product_id}`}
        className="relative aspect-[3/4] overflow-hidden bg-raised"
      >
        <img
          src={productImageUrl(product)}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          loading="lazy"
        />

        {/* Subtle scrim for button visibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Out of stock overlay */}
        {!product.availability && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[3px]">
            <span className="rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-white/90">
              Out of stock
            </span>
          </div>
        )}

        {/* Discount badge */}
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white shadow-md">
            −{Math.round(product.discount!)}%
          </span>
        )}

        {/* Wishlist button */}
        <button
          type="button"
          onClick={handleWishlist}
          className={`absolute right-3 top-3 flex size-8 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition-all duration-200 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 ${
            isWishlisted
              ? "bg-red-500 text-white"
              : "bg-card/90 text-ink3 hover:bg-red-500 hover:text-white"
          }`}
          aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
        >
          <HeartIcon className="size-3.5" filled={isWishlisted} />
        </button>
      </Link>

      {/* ── Info ── */}
      <div className="flex flex-1 flex-col p-3.5">

        {/* Category + rating row */}
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-ink4">
            {categoryName ?? product.brand ?? ""}
          </p>
          {product.rating != null && (
            <div className="flex shrink-0 items-center gap-0.5">
              <StarIcon className="size-3 text-amber-400" filled />
              <span className="text-[11px] font-medium tabular-nums text-ink4">
                {product.rating.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Name */}
        <Link
          to={`/products/${product.product_id}`}
          className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
        >
          {product.name}
        </Link>

        {/* Price row */}
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="text-sm font-bold tabular-nums text-ink leading-none">
              ${displayPrice.toFixed(2)}
              {product.unit && (
                <span className="text-[11px] font-normal text-ink4"> /{product.unit}</span>
              )}
            </p>
            {hasDiscount && (
              <p className="mt-0.5 text-[11px] tabular-nums text-ink4 line-through">
                ${product.price.toFixed(2)}
              </p>
            )}
          </div>

          {/* Add to cart — always visible */}
          {product.availability && (
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={addToCart.isPending}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke bg-raised px-2.5 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:border-emerald-500/40 hover:bg-emerald-600 hover:text-white disabled:opacity-50"
              aria-label="Add to cart"
            >
              <CartIcon className="size-3.5" />
              {addToCart.isPending ? "…" : "Add"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
