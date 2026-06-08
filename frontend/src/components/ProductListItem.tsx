import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { productImageUrl } from "../lib/productImage";
import type { Product } from "../lib/types";
import { CartIcon, HeartIcon } from "./Icons";
import { useAuth } from "../context/AuthContext";
import { useCartMutations } from "../hooks/useCartMutations";
import { useWishlist } from "../context/WishlistContext";

export function ProductListItem({ product }: { product: Product }) {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { addItem } = useCartMutations();
  const { toggle, has } = useWishlist();
  const isWishlisted = has(product.product_id);

  const displayPrice = product.discount && product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price;
  const hasDiscount = Boolean(product.discount && product.discount > 0);
  const categoryName = product.category && "name" in product.category ? product.category.name : null;

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggle(product.product_id);
    toast(isWishlisted ? "Removed from wishlist" : "Saved to wishlist");
  }

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) { navigate("/login"); return; }
    if (!product.availability) return;
    addItem.mutate(
      { productId: product.product_id, quantity: 1 },
      {
        onSuccess: () =>
          toast.success(
            `${product.name.slice(0, 30)}${product.name.length > 30 ? "…" : ""} added to cart`,
            { action: { label: "View cart", onClick: () => navigate("/cart") } },
          ),
      },
    );
  }

  return (
    <Link
      to={`/products/${product.product_id}`}
      className="group flex items-center gap-4 rounded-2xl border border-stroke bg-card px-4 py-3.5 transition-all duration-200 hover:border-edge hover:bg-raised hover:shadow-lg hover:shadow-black/8"
    >
      {/* Image */}
      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-raised sm:size-[72px]">
        <img
          src={productImageUrl(product)}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
          loading="lazy"
        />
        {hasDiscount && (
          <span className="absolute left-1 top-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-bold text-white">
            −{Math.round(product.discount!)}%
          </span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-ink4">
          {categoryName ?? product.brand ?? ""}
        </p>
        <p className="mt-0.5 line-clamp-1 text-sm font-semibold text-ink transition-colors group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
          {product.name}
        </p>
        {product.description && (
          <p className="mt-0.5 hidden line-clamp-1 text-xs text-ink4 sm:block">
            {product.description}
          </p>
        )}
        {!product.availability && (
          <span className="mt-1 inline-block text-[11px] font-medium text-red-400">
            Out of stock
          </span>
        )}
      </div>

      {/* Price + rating */}
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums text-ink">${displayPrice.toFixed(2)}</p>
        {hasDiscount && (
          <p className="text-[11px] tabular-nums text-ink4 line-through">${product.price.toFixed(2)}</p>
        )}
        {product.rating != null && (
          <p className="mt-0.5 text-[11px] font-medium text-amber-500">★ {product.rating.toFixed(1)}</p>
        )}
      </div>

      {/* Wishlist */}
      <button
        type="button"
        onClick={handleWishlist}
        aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        className={`hidden sm:flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all ${
          isWishlisted
            ? "border-red-500/30 bg-red-500/10 text-red-500"
            : "border-stroke bg-raised text-ink3 hover:border-red-400/30 hover:bg-red-400/8 hover:text-red-400"
        }`}
      >
        <HeartIcon className="size-3.5" filled={isWishlisted} />
      </button>

      {/* Add to cart */}
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={!product.availability || addItem.isPending}
        aria-label={`Add ${product.name} to cart`}
        className="ml-1 flex size-8 shrink-0 items-center justify-center rounded-lg border border-stroke bg-raised text-ink3 transition-all hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-emerald-400"
      >
        {addItem.isPending ? (
          <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        ) : (
          <CartIcon className="size-3.5" />
        )}
      </button>

      {/* Chevron */}
      <svg
        className="size-4 shrink-0 text-ink4 transition-all group-hover:translate-x-0.5 group-hover:text-ink3"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}
