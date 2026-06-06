import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { productImageUrl } from "../lib/productImage";
import type { Product } from "../lib/types";
import { CartIcon, HeartIcon, StarIcon } from "./Icons";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { useCartMutations } from "../hooks/useCartMutations";
import { QuickViewModal } from "./QuickViewModal";
import { Img } from "./Img";

export function ProductCard({ product }: { product: Product }) {
  const { token } = useAuth();
  const { toggle, has } = useWishlist();
  const navigate = useNavigate();
  const { addItem } = useCartMutations();
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const isWishlisted = has(product.product_id);

  const categoryName =
    product.category && "name" in product.category ? product.category.name : null;

  const discountedPrice =
    product.discount && product.discount > 0
      ? product.price * (1 - product.discount / 100)
      : null;

  const displayPrice = discountedPrice ?? product.price;
  const hasDiscount = discountedPrice !== null;

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!token) { navigate("/login"); return; }
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

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    toggle(product.product_id);
    /* Fix #17 — consistent icon instead of platform-specific emoji */
    toast(isWishlisted ? "Removed from wishlist" : "Saved to wishlist", {
      icon: isWishlisted
        ? <svg className="size-4 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        : <svg className="size-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>,
    });
  }

  return (
    <>
      <article className="group flex flex-col overflow-hidden rounded-2xl border border-stroke bg-card transition-all duration-300 hover:border-edge hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/35 [will-change:transform]">

        <Link to={`/products/${product.product_id}`} className="relative aspect-square overflow-hidden bg-raised">
          <Img
            src={productImageUrl(product)}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            wrapperClassName="h-full w-full"
            loading="lazy"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {!product.availability && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[3px]">
              <span className="rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-white/90">
                Out of stock
              </span>
            </div>
          )}

          {hasDiscount && (
            <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white shadow-md">
              −{Math.round(product.discount!)}%
            </span>
          )}

          {/* Quick view button — appears on hover */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setQuickViewOpen(true); }}
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 translate-y-1 rounded-lg border border-white/20 bg-black/60 px-3 py-1.5 text-[11px] font-semibold text-white opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-black/80"
          >
            Quick view
          </button>

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

        <div className="flex flex-1 flex-col p-3.5">
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-ink4">
              {categoryName ?? product.brand ?? ""}
            </p>
            {product.rating != null && (
              <div className="flex shrink-0 items-center gap-0.5">
                <StarIcon className="size-3 text-amber-400" filled />
                <span className="text-[11px] font-medium tabular-nums text-ink4">{product.rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          <Link
            to={`/products/${product.product_id}`}
            className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            {product.name}
          </Link>

          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <div>
              <p className="text-sm font-bold tabular-nums text-ink leading-none">
                ${displayPrice.toFixed(2)}
                {product.unit && <span className="text-[11px] font-normal text-ink4"> /{product.unit}</span>}
              </p>
              {hasDiscount && (
                <p className="mt-0.5 text-[11px] tabular-nums text-ink4 line-through">${product.price.toFixed(2)}</p>
              )}
            </div>

            {product.availability && (
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={addItem.isPending}
                className="flex shrink-0 items-center gap-1.5 rounded-lg border border-stroke bg-raised px-2.5 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:border-emerald-500/40 hover:bg-emerald-600 hover:text-white disabled:opacity-50"
                aria-label="Add to cart"
              >
                <CartIcon className="size-3.5" />
                {addItem.isPending ? "…" : "Add"}
              </button>
            )}
          </div>
        </div>
      </article>

      <QuickViewModal
        product={product}
        open={quickViewOpen}
        onClose={() => setQuickViewOpen(false)}
      />
    </>
  );
}
