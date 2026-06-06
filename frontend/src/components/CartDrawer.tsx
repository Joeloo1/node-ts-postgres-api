import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { queryKeys } from "../lib/queryKeys";
import * as cartService from "../services/cart";
import { useCartMutations } from "../hooks/useCartMutations";
import { useWishlist } from "../context/WishlistContext";
import { productImageUrl } from "../lib/productImage";
import type { Cart } from "../lib/types";
import { CartIcon, HeartIcon, MinusIcon, PlusIcon, TrashIcon, XIcon, TruckIcon, ArrowRightIcon } from "./Icons";
import { Img } from "./Img";

export function CartDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { updateItem, removeItem } = useCartMutations();
  const { toggle } = useWishlist();
  const drawerRef = useRef<HTMLDivElement>(null);

  function handleSaveForLater(productId: string, itemId: string) {
    toggle(productId);
    removeItem.mutate(itemId);
    toast.success("Saved to wishlist", { icon: "❤️" });
  }

  const cartQuery = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: cartService.getCart,
    enabled: open,
  });

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = drawerRef.current;
    const handler = (e: KeyboardEvent) => {
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
    document.addEventListener("keydown", handler);
    setTimeout(() => drawerRef.current?.querySelector<HTMLElement>("button")?.focus(), 50);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const cart: Cart | undefined = cartQuery.data;
  const items    = cart?.items ?? [];
  const subtotal = items.reduce((sum, i) => {
    const price = i.product.discount && i.product.discount > 0
      ? i.product.price * (1 - i.product.discount / 100)
      : i.product.price;
    return sum + price * i.quantity;
  }, 0);
  const originalTotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const totalSavings  = originalTotal - subtotal;
  const THRESHOLD    = 50;
  const shipProgress = Math.min((subtotal / THRESHOLD) * 100, 100);
  const remaining    = THRESHOLD - subtotal;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            key="drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Shopping cart"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-sm flex-col bg-page border-l border-stroke shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-stroke px-5 py-4">
              <div className="flex items-center gap-2">
                <CartIcon className="size-5 text-ink3" />
                <h2 className="font-display text-lg font-semibold text-ink">
                  Cart
                  {items.length > 0 && <span className="ml-1.5 text-sm font-normal text-ink4">({items.length})</span>}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-8 items-center justify-center rounded-lg text-ink3 transition-colors hover:bg-hover hover:text-ink"
                aria-label="Close cart"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {cartQuery.isPending ? (
                <div className="space-y-0 divide-y divide-stroke">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3 p-4">
                      <div className="size-16 shrink-0 animate-shimmer rounded-lg" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-3/4 animate-shimmer rounded" />
                        <div className="h-3 w-1/3 animate-shimmer rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 px-8 py-16 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-raised">
                    <CartIcon className="size-7 text-ink4" />
                  </div>
                  <div>
                    <p className="font-semibold text-ink">Your cart is empty</p>
                    <p className="mt-1 text-sm text-ink4">Add items from the shop to get started.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { onClose(); navigate("/products"); }}
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Browse products
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  <ul className="divide-y divide-stroke">
                    {items.map((line) => {
                      const price = line.product.discount && line.product.discount > 0
                        ? line.product.price * (1 - line.product.discount / 100)
                        : line.product.price;
                      return (
                        <motion.li
                          key={line.id}
                          layout
                          exit={{ opacity: 0, x: 40 }}
                          transition={{ duration: 0.18 }}
                          className="flex gap-3 p-4"
                        >
                          <Link to={`/products/${line.product.product_id}`} onClick={onClose} className="size-16 shrink-0 rounded-lg bg-raised">
                            <Img src={productImageUrl(line.product)} alt={line.product.name} className="h-full w-full object-cover transition-transform hover:scale-105" wrapperClassName="size-16 rounded-lg overflow-hidden" loading="lazy" />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <Link to={`/products/${line.product.product_id}`} onClick={onClose} className="line-clamp-2 text-sm font-medium text-ink transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                              {line.product.name}
                            </Link>
                            <p className="mt-0.5 text-xs tabular-nums text-ink4">${price.toFixed(2)}</p>

                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex items-center overflow-hidden rounded-lg border border-stroke bg-input">
                                <button
                                  type="button"
                                  onClick={() => updateItem.mutate({ itemId: line.id, quantity: Math.max(1, line.quantity - 1) })}
                                  disabled={updateItem.isPending}
                                  className="px-2 py-1 text-ink3 transition-colors hover:text-ink disabled:opacity-40"
                                >
                                  <MinusIcon className="size-3" />
                                </button>
                                <span className="w-7 select-none text-center text-xs font-semibold text-ink">{line.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateItem.mutate({ itemId: line.id, quantity: Math.min(99, line.quantity + 1) })}
                                  disabled={updateItem.isPending}
                                  className="px-2 py-1 text-ink3 transition-colors hover:text-ink disabled:opacity-40"
                                >
                                  <PlusIcon className="size-3" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSaveForLater(line.product.product_id, line.id)}
                                className="text-ink4 transition-colors hover:text-emerald-500"
                                aria-label="Save for later"
                                title="Save for later"
                              >
                                <HeartIcon className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem.mutate(line.id)}
                                disabled={removeItem.isPending}
                                className="text-ink4 transition-colors hover:text-red-400 disabled:opacity-40"
                                aria-label="Remove"
                              >
                                <TrashIcon className="size-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">
                            ${(price * line.quantity).toFixed(2)}
                          </p>
                        </motion.li>
                      );
                    })}
                  </ul>
                </AnimatePresence>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-stroke px-5 py-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={subtotal >= THRESHOLD ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-ink3"}>
                      {subtotal >= THRESHOLD ? "🎉 Free shipping unlocked!" : "Free shipping progress"}
                    </span>
                    <span className="tabular-nums text-ink4">${subtotal.toFixed(2)} / $50</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-well">
                    <motion.div
                      className="h-full rounded-full bg-emerald-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${shipProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  {subtotal < THRESHOLD && (
                    <p className="text-[11px] text-ink4">
                      Add <span className="font-semibold text-ink">${remaining.toFixed(2)}</span> more for free shipping
                    </p>
                  )}
                </div>

                {totalSavings > 0.01 && (
                  <div className="flex items-center justify-between text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <span>You're saving</span>
                    <span className="tabular-nums">−${totalSavings.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-[15px] font-bold text-ink">
                  <span>Subtotal</span>
                  <span className="tabular-nums">${subtotal.toFixed(2)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => { onClose(); navigate("/checkout"); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Checkout
                  <ArrowRightIcon className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => { onClose(); navigate("/cart"); }}
                  className="w-full rounded-xl border border-stroke py-2.5 text-sm font-medium text-ink2 transition-colors hover:bg-raised"
                >
                  View full cart
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-ink4">
                  <TruckIcon className="size-3.5" />
                  Free shipping over $50 · 30-day returns
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
