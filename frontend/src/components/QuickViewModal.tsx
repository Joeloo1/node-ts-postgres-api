import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useCartMutations } from "../hooks/useCartMutations";
import { productImageUrl } from "../lib/productImage";
import type { Product } from "../lib/types";
import { ArrowRightIcon, CartIcon, HeartIcon, XIcon } from "./Icons";

interface Props {
  product: Product;
  open: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, open, onClose }: Props) {
  const { token } = useAuth();
  const { toggle, has } = useWishlist();
  const navigate = useNavigate();
  const { addItem } = useCartMutations();
  const dialogRef = useRef<HTMLDivElement>(null);
  const isWishlisted = has(product.product_id);

  const displayPrice = product.discount && product.discount > 0
    ? product.price * (1 - product.discount / 100)
    : product.price;
  const hasDiscount = Boolean(product.discount && product.discount > 0);
  const categoryName = product.category && "name" in product.category ? product.category.name : null;

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  /* Fix #25 — focus trap */
  useEffect(() => {
    if (!open) return;
    const el = dialogRef.current;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab" || !el) return;
      const focusable = Array.from(
        el.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      );
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    };

    document.addEventListener("keydown", handleKey);
    /* Focus first interactive element */
    const firstBtn = el?.querySelector<HTMLElement>("button, [href]");
    firstBtn?.focus();
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function handleAddToCart() {
    if (!token) { onClose(); navigate("/login"); return; }
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
    e.stopPropagation();
    toggle(product.product_id);
    toast(isWishlisted ? "Removed from wishlist" : "Saved to wishlist", {
      icon: isWishlisted ? "🗑️" : "❤️",
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-x-4 top-1/2 z-[101] mx-auto max-w-2xl -translate-y-1/2 overflow-hidden rounded-2xl border border-stroke bg-page shadow-2xl sm:inset-x-8"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3 top-3 z-10 flex size-8 items-center justify-center rounded-lg bg-page/80 text-ink3 backdrop-blur-sm transition-colors hover:bg-raised hover:text-ink"
              aria-label="Close"
            >
              <XIcon className="size-4" />
            </button>

            <div className="grid sm:grid-cols-2">
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-raised">
                <img
                  src={productImageUrl(product)}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
                {hasDiscount && (
                  <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white shadow-md">
                    −{Math.round(product.discount!)}%
                  </span>
                )}
                {!product.availability && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                    <span className="rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-semibold text-white/90">
                      Out of stock
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div>
                  {categoryName && (
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                      {categoryName}
                    </p>
                  )}
                  <h2 className="mt-1 font-display text-xl font-bold leading-tight text-ink">{product.name}</h2>
                  {product.brand && <p className="mt-0.5 text-xs text-ink4">by {product.brand}</p>}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tabular-nums text-ink">${displayPrice.toFixed(2)}</span>
                  {hasDiscount && (
                    <>
                      <span className="text-sm tabular-nums text-ink4 line-through">${product.price.toFixed(2)}</span>
                      <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                        −{Math.round(product.discount!)}%
                      </span>
                    </>
                  )}
                </div>

                {/* Rating */}
                {product.rating != null && (
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <span key={n} className={`text-sm leading-none ${n <= Math.round(product.rating!) ? "text-amber-400" : "text-ink4"}`}>★</span>
                    ))}
                    <span className="text-xs font-semibold text-ink">{product.rating.toFixed(1)}</span>
                  </div>
                )}

                {/* Description */}
                {product.description && (
                  <p className="line-clamp-3 text-[13px] leading-relaxed text-ink3">{product.description}</p>
                )}

                {/* Stock badge */}
                {product.availability ? (
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    In stock
                    {product.stock !== undefined && product.stock < 10 && (
                      <span className="text-amber-600 dark:text-amber-400"> · only {product.stock} left</span>
                    )}
                  </span>
                ) : (
                  <span className="inline-flex w-fit rounded-full border border-stroke bg-well px-2.5 py-0.5 text-xs font-semibold text-ink3">
                    Out of stock
                  </span>
                )}

                {/* Actions */}
                <div className="mt-auto space-y-2 border-t border-stroke pt-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!product.availability || addItem.isPending}
                      onClick={handleAddToCart}
                      className="relative flex flex-1 items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.97] disabled:opacity-50"
                    >
                      {!addItem.isPending && product.availability && (
                        <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                      )}
                      <CartIcon className="size-4" />
                      {addItem.isPending ? "Adding…" : "Add to cart"}
                    </button>

                    <button
                      type="button"
                      onClick={handleWishlist}
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                        isWishlisted
                          ? "border-red-500/30 bg-red-500/10 text-red-500"
                          : "border-stroke text-ink3 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-500"
                      }`}
                      aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
                    >
                      <HeartIcon className="size-4" filled={isWishlisted} />
                    </button>
                  </div>

                  <Link
                    to={`/products/${product.product_id}`}
                    onClick={onClose}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-stroke py-2.5 text-sm font-medium text-ink2 transition-colors hover:bg-raised"
                  >
                    View full details
                    <ArrowRightIcon className="size-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
