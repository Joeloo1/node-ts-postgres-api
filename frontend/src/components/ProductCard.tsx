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
  const [addedFeedback, setAddedFeedback] = useState(false);
  const isWishlisted = has(product.product_id);

  const categoryName =
    product.category && "name" in product.category ? product.category.name : null;

  /* ── Derived price values ── */
  const discountedPrice =
    product.discount && product.discount > 0
      ? product.price * (1 - product.discount / 100)
      : null;
  const displayPrice  = discountedPrice ?? product.price;
  const hasDiscount   = discountedPrice !== null;
  const savingsAmount = hasDiscount ? product.price - displayPrice : 0;

  /* ── Meta label: "Brand · Category" ── */
  const metaLabel = [product.brand, categoryName].filter(Boolean).join(" · ");

  /* ── Stock state ── */
  const isLowStock    = product.stock != null && product.stock > 0 && product.stock <= 3;
  const isHealthyStock = product.availability && (!product.stock || product.stock > 3);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    if (!token) { navigate("/login"); return; }
    addItem.mutate(
      { productId: product.product_id, quantity: 1 },
      {
        onSuccess: () => {
          toast.success(
            `${product.name.slice(0, 30)}${product.name.length > 30 ? "…" : ""} added to cart`,
            { action: { label: "View cart", onClick: () => navigate("/cart") } },
          );
          setAddedFeedback(true);
          setTimeout(() => setAddedFeedback(false), 1500);
        },
      },
    );
  }

  function handleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    toggle(product.product_id);
    toast(isWishlisted ? "Removed from wishlist" : "Saved to wishlist", {
      icon: isWishlisted
        ? <svg className="size-4 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        : <svg className="size-4 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" /></svg>,
    });
  }

  return (
    <>
      <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-stroke bg-card transition-all duration-300 hover:-translate-y-0.5 hover:border-edge hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/35 [will-change:transform]">
        {/* Glass inner highlight */}
        <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-glass" />

        {/* ── Image area ── */}
        <Link to={`/products/${product.product_id}`} className="relative aspect-[4/5] overflow-hidden bg-raised">
          <Img
            src={productImageUrl(product)}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            wrapperClassName="h-full w-full"
            loading="lazy"
          />

          {/* Hover gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Out of stock overlay */}
          {!product.availability && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[3px]">
              <span className="rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-white/90">
                Out of stock
              </span>
            </div>
          )}

          {/* Top-left badges */}
          <div className="absolute left-2.5 top-2.5 flex flex-col gap-1">
            {hasDiscount && (
              <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-white shadow-sm">
                −{Math.round(product.discount!)}%
              </span>
            )}
            {isLowStock && !hasDiscount && (
              <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                {product.stock === 1 ? "1 left" : `${product.stock} left`}
              </span>
            )}
          </div>

          {/* Quick view */}
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); setQuickViewOpen(true); }}
            className="absolute bottom-2.5 left-1/2 -translate-x-1/2 translate-y-2 rounded-lg border border-white/20 bg-black/65 px-3 py-1.5 text-[11px] font-semibold text-white opacity-0 backdrop-blur-sm transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 hover:bg-black/80 whitespace-nowrap"
          >
            Quick view
          </button>

          {/* Wishlist */}
          <button
            type="button"
            onClick={handleWishlist}
            aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
            className={`absolute right-2.5 top-2.5 flex size-7.5 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition-all duration-200 sm:translate-y-1 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100 ${
              isWishlisted
                ? "bg-red-500 text-white"
                : "bg-white/90 text-ink3 hover:bg-red-500 hover:text-white dark:bg-card/90"
            }`}
          >
            <HeartIcon className="size-3.5" filled={isWishlisted} />
          </button>
        </Link>

        {/* ── Info area ── */}
        <div className="flex flex-1 flex-col p-3.5">

          {/* Meta row: brand · category + rating */}
          <div className="mb-1.5 flex items-center justify-between gap-1">
            {metaLabel ? (
              product.category_id ? (
                <Link
                  to={`/products?category_id=${product.category_id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="truncate text-[10px] font-semibold uppercase tracking-widest text-ink4 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
                >
                  {metaLabel}
                </Link>
              ) : (
                <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-ink4">
                  {metaLabel}
                </p>
              )
            ) : (
              <span />
            )}
            {product.rating != null && (
              <div className="flex shrink-0 items-center gap-0.5">
                <StarIcon className="size-3 text-amber-400" filled />
                <span className="text-[11px] font-semibold tabular-nums text-ink4">
                  {product.rating.toFixed(1)}
                </span>
              </div>
            )}
          </div>

          {/* Product name */}
          <Link
            to={`/products/${product.product_id}`}
            className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
          >
            {product.name}
          </Link>

          {/* Price + add to cart */}
          <div className="mt-auto pt-3">
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="flex items-baseline gap-1.5">
                  <p className="text-sm font-bold tabular-nums text-ink leading-none">
                    ${displayPrice.toFixed(2)}
                    {product.unit && (
                      <span className="text-[11px] font-normal text-ink4"> /{product.unit}</span>
                    )}
                  </p>
                  {hasDiscount && (
                    <p className="text-[11px] tabular-nums text-ink4 line-through">
                      ${product.price.toFixed(2)}
                    </p>
                  )}
                </div>

                {/* Savings amount */}
                {hasDiscount && (
                  <p className="mt-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    Save ${savingsAmount.toFixed(2)}
                  </p>
                )}

                {/* In-stock indicator */}
                {isHealthyStock && (
                  <div className="mt-1 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] font-medium text-ink4">In stock</span>
                  </div>
                )}
              </div>

              {product.availability && (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  disabled={addItem.isPending || addedFeedback}
                  aria-label="Add to cart"
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all active:scale-[0.97] disabled:cursor-default ${
                    addedFeedback
                      ? "bg-emerald-500 shadow-emerald-500/20"
                      : "bg-emerald-600 shadow-emerald-500/20 hover:bg-emerald-700 hover:shadow-emerald-500/30 disabled:opacity-50"
                  }`}
                >
                  {addItem.isPending ? (
                    <>
                      <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      …
                    </>
                  ) : addedFeedback ? (
                    <>
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Added!
                    </>
                  ) : (
                    <>
                      <CartIcon className="size-3.5" />
                      Add
                    </>
                  )}
                </button>
              )}
            </div>
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
