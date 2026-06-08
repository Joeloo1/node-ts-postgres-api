import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { toast } from "sonner";
import { CartSkeleton } from "../components/ProductSkeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { queryKeys } from "../lib/queryKeys";
import * as cartService from "../services/cart";
import { useCartMutations } from "../hooks/useCartMutations";
import { useWishlist } from "../context/WishlistContext";
import { productImageUrl } from "../lib/productImage";
import { HeartIcon, MinusIcon, PackageIcon, PlusIcon, ShieldIcon, TrashIcon, TruckIcon } from "../components/Icons";
import { Img } from "../components/Img";

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const rowFade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
  exit:   { opacity: 0, x: 30, transition: { duration: 0.2 } },
};

export function CartPage() {
  usePageTitle("Cart");
  const { updateItem, removeItem } = useCartMutations();
  const { toggle } = useWishlist();
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, _setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  function handleApplyPromo(e: React.FormEvent) {
    e.preventDefault();
    if (!promoCode.trim() || promoLoading) return;
    setPromoLoading(true);
    setPromoError(null);
    setTimeout(() => {
      setPromoLoading(false);
      setPromoError("This promo code is invalid or has expired.");
    }, 700);
  }

  const cartQuery = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: cartService.getCart,
  });

  if (cartQuery.isPending) return <CartSkeleton />;

  if (cartQuery.isError) {
    return (
      <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-6 text-center">
        <p className="text-sm text-red-300">{(cartQuery.error as Error).message}</p>
      </div>
    );
  }

  const cart = cartQuery.data!;
  const items = cart.items ?? [];
  const subtotal = items.reduce((sum, i) => {
    const price = i.product.discount && i.product.discount > 0
      ? i.product.price * (1 - i.product.discount / 100)
      : i.product.price;
    return sum + price * i.quantity;
  }, 0);
  const originalTotal = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const totalSavings = originalTotal - subtotal;
  const SHIP_THRESHOLD = 50;
  const shipProgress = Math.min((subtotal / SHIP_THRESHOLD) * 100, 100);

  function handleSaveForLater(productId: string, itemId: string) {
    toggle(productId);
    removeItem.mutate(itemId);
    toast.success("Saved to wishlist", { icon: "❤️" });
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-20 text-center">
        <PackageIcon className="size-14 text-ink4" />
        <h1 className="mt-5 font-display text-2xl font-bold text-ink">Your cart is empty</h1>
        <p className="mt-2 text-ink4">Add something from the shop to get started.</p>
        <Link to="/products" className="mt-8 inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="font-display text-3xl font-bold text-ink">Your cart</h1>
        <p className="mt-1 text-sm text-ink4">{items.length} item{items.length !== 1 ? "s" : ""}</p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        <motion.ul className="space-y-3 lg:col-span-2" variants={stagger} initial="hidden" animate="show">
          <AnimatePresence initial={false}>
            {items.map((line) => {
              const price = line.product.discount && line.product.discount > 0
                ? line.product.price * (1 - line.product.discount / 100)
                : line.product.price;
              return (
                <motion.li
                  key={line.id}
                  variants={rowFade}
                  exit="exit"
                  layout
                  className="flex gap-4 rounded-xl border border-stroke bg-card p-4 transition-colors hover:border-edge"
                >
                  <Link to={`/products/${line.product.product_id}`} className="h-24 w-24 shrink-0 rounded-xl bg-raised">
                    <Img src={productImageUrl(line.product)} alt={line.product.name} className="h-full w-full object-cover transition-transform hover:scale-105" wrapperClassName="h-full w-full rounded-xl overflow-hidden" />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${line.product.product_id}`} className="font-medium text-ink transition-colors hover:text-emerald-400 line-clamp-2">
                      {line.product.name}
                    </Link>
                    <p className="mt-0.5 text-sm tabular-nums text-ink4">
                      ${price.toFixed(2)} each
                      {line.product.discount && line.product.discount > 0 ? (
                        <span className="ml-1.5 text-xs line-through text-ink4">${line.product.price.toFixed(2)}</span>
                      ) : null}
                    </p>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <div className="flex items-center rounded-lg border border-stroke bg-input">
                        <button type="button" onClick={() => updateItem.mutate({ itemId: line.id, quantity: Math.max(1, line.quantity - 1) })} disabled={updateItem.isPending} className="px-2.5 py-1.5 text-ink3 transition-colors hover:text-ink disabled:opacity-50" aria-label="Decrease quantity">
                          <MinusIcon className="size-3.5" />
                        </button>
                        <span className="w-8 select-none text-center text-sm font-semibold text-ink">{line.quantity}</span>
                        <button type="button" onClick={() => updateItem.mutate({ itemId: line.id, quantity: Math.min(99, line.quantity + 1) })} disabled={updateItem.isPending} className="px-2.5 py-1.5 text-ink3 transition-colors hover:text-ink disabled:opacity-50" aria-label="Increase quantity">
                          <PlusIcon className="size-3.5" />
                        </button>
                      </div>

                      {/* Save for later — Fix #8 */}
                      <button
                        type="button"
                        onClick={() => handleSaveForLater(line.product.product_id, line.id)}
                        className="flex items-center gap-1.5 text-sm text-ink4 transition-colors hover:text-emerald-500"
                      >
                        <HeartIcon className="size-3.5" />
                        Save for later
                      </button>

                      <button type="button" onClick={() => removeItem.mutate(line.id)} disabled={removeItem.isPending} className="flex items-center gap-1.5 text-sm text-ink4 transition-colors hover:text-red-400 disabled:opacity-50">
                        <TrashIcon className="size-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums text-ink">${(price * line.quantity).toFixed(2)}</p>
                    {line.product.discount && line.product.discount > 0 && (
                      <p className="mt-0.5 text-[11px] text-emerald-500">
                        −${(line.product.price * line.product.discount / 100 * line.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </motion.ul>

        {/* Order summary */}
        <motion.aside
          className="sticky top-24 h-fit space-y-5 rounded-xl border border-stroke bg-card p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <h2 className="font-display text-lg font-semibold text-ink">Order summary</h2>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-ink3">
              <span>Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})</span>
              <span className="tabular-nums text-ink">${subtotal.toFixed(2)}</span>
            </div>
            {/* Total savings — Fix #20 */}
            {totalSavings > 0.01 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>You're saving</span>
                <span className="tabular-nums font-semibold">−${totalSavings.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink3">
              <span>Shipping</span>
              <span className="text-emerald-400">{subtotal >= 50 ? "Free" : "$4.99"}</span>
            </div>
          </div>

          <div className="flex justify-between border-t border-stroke pt-3 text-base font-semibold text-ink">
            <span>Total</span>
            <span className="tabular-nums">${(subtotal + (subtotal >= 50 ? 0 : 4.99)).toFixed(2)}</span>
          </div>

          {/* Promo code */}
          <form onSubmit={handleApplyPromo} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Promo code</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(null); }}
                placeholder="Enter code"
                disabled={promoApplied}
                className="flex-1 rounded-lg border border-stroke bg-input px-3 py-2 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!promoCode.trim() || promoApplied || promoLoading}
                className="shrink-0 rounded-lg border border-stroke bg-raised px-3.5 py-2 text-xs font-semibold text-ink2 transition-colors hover:bg-well disabled:opacity-50"
              >
                {promoLoading ? "…" : promoApplied ? "Applied" : "Apply"}
              </button>
            </div>
            {promoError && (
              <p className="text-[11px] text-red-400">{promoError}</p>
            )}
            {promoApplied && (
              <p className="text-[11px] font-medium text-emerald-500">Promo code applied!</p>
            )}
          </form>

          <div className="space-y-2 rounded-xl border border-stroke bg-card p-3">
            <div className="flex justify-between text-xs">
              <span className={subtotal >= SHIP_THRESHOLD ? "font-medium text-emerald-400" : "text-ink3"}>
                {subtotal >= SHIP_THRESHOLD ? "🎉 Free shipping unlocked!" : "Free shipping progress"}
              </span>
              <span className="tabular-nums text-ink4">${subtotal.toFixed(2)} / $50</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-well">
              <motion.div className="h-full rounded-full bg-emerald-500" initial={{ width: 0 }} animate={{ width: `${shipProgress}%` }} transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }} />
            </div>
            {subtotal < SHIP_THRESHOLD && (
              <p className="text-xs text-ink4">Add <span className="font-semibold text-ink">${(SHIP_THRESHOLD - subtotal).toFixed(2)}</span> more for free shipping</p>
            )}
          </div>

          <Link to="/checkout" className="block w-full rounded-xl bg-emerald-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
            Proceed to checkout
          </Link>
          <Link to="/products" className="block text-center text-xs text-ink4 transition-colors hover:text-ink2">Continue shopping</Link>

          <div className="space-y-2 border-t border-stroke pt-4">
            {[{ icon: ShieldIcon, text: "Secure checkout" }, { icon: TruckIcon, text: "Free shipping over $50" }].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-ink4">
                <Icon className="size-4 shrink-0 text-ink3" />
                {text}
              </div>
            ))}
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
