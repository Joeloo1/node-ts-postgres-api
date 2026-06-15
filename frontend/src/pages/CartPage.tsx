import { useQueries, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { toast } from "sonner";
import { CartSkeleton } from "../components/ProductSkeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { queryKeys } from "../lib/queryKeys";
import * as cartService from "../services/cart";
import * as productService from "../services/products";
import { useCartMutations } from "../hooks/useCartMutations";
import { useWishlist } from "../context/WishlistContext";
import { productImageUrl } from "../lib/productImage";
import type { Product } from "../lib/types";
import { FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_FLAT_RATE } from "../lib/constants";
import {
  ArrowRightIcon,
  HeartIcon,
  LockClosedIcon,
  MinusIcon,
  PackageIcon,
  PlusIcon,
  ShieldIcon,
  TagIcon,
  TrashIcon,
  TruckIcon,
} from "../components/Icons";
import { Img } from "../components/Img";
import { ConfirmButton } from "../components/ConfirmButton";

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const rowFade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
  exit:   { opacity: 0, x: 30, transition: { duration: 0.2 } },
};

function QuantityInput({
  value,
  min = 1,
  max = 99,
  onChange,
  disabled,
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (q: number) => void;
  disabled?: boolean;
}) {
  const [local, setLocal] = useState(String(value));
  const focused  = useRef(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!focused.current) setLocal(String(value));
  }, [value]);

  useEffect(() => () => { if (debounce.current) clearTimeout(debounce.current); }, []);

  function stepBy(delta: number) {
    const next = Math.min(max, Math.max(min, value + delta));
    setLocal(String(next));
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => onChange(next), 300);
  }

  function commit() {
    focused.current = false;
    if (debounce.current) clearTimeout(debounce.current);
    const n = parseInt(local, 10);
    if (!isNaN(n) && n >= min && n <= max) {
      if (n !== value) onChange(n);
    } else {
      setLocal(String(value));
    }
  }

  return (
    <div className="flex items-center rounded-lg border border-stroke bg-input">
      <button
        type="button"
        onClick={() => stepBy(-1)}
        disabled={disabled || value <= min}
        className="px-2.5 py-1.5 text-ink3 transition-colors hover:text-ink disabled:opacity-30"
        aria-label="Decrease quantity"
      >
        <MinusIcon className="size-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={local}
        onChange={(e) => setLocal(e.target.value.replace(/\D/g, ""))}
        onFocus={() => { focused.current = true; }}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        disabled={disabled}
        className="w-10 bg-transparent text-center text-sm font-semibold text-ink focus:outline-none disabled:opacity-50"
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={() => stepBy(1)}
        disabled={disabled || value >= max}
        className="px-2.5 py-1.5 text-ink3 transition-colors hover:text-ink disabled:opacity-30"
        aria-label="Increase quantity"
      >
        <PlusIcon className="size-3.5" />
      </button>
    </div>
  );
}

function SavedForLaterSection({
  products,
  onMoveToCart,
  onRemove,
  isPending,
}: {
  products: Product[];
  onMoveToCart: (p: Product) => void;
  onRemove: (p: Product) => void;
  isPending: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4"
    >
      <h2 className="font-display text-lg font-semibold text-ink">
        Saved for later
        <span className="ml-2 text-sm font-normal text-ink4">({products.length})</span>
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => {
          const discountedPrice = product.discount && product.discount > 0
            ? product.price * (1 - product.discount / 100)
            : product.price;
          return (
            <li key={product.product_id} className="flex gap-3 rounded-xl border border-stroke bg-card p-4">
              <Link to={`/products/${product.product_id}`} className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-raised">
                {product.image ? (
                  <img src={productImageUrl(product)} alt={product.name} className="h-full w-full object-cover transition-transform hover:scale-105" loading="lazy" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <PackageIcon className="size-5 text-ink4" />
                  </div>
                )}
                {product.discount && product.discount > 0 ? (
                  <span className="absolute -right-1 -top-1 rounded-full bg-emerald-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white shadow">
                    -{product.discount}%
                  </span>
                ) : null}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/products/${product.product_id}`} className="line-clamp-2 text-sm font-medium text-ink transition-colors hover:text-emerald-400">
                  {product.name}
                </Link>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-ink">
                  ${discountedPrice.toFixed(2)}
                  {product.discount && product.discount > 0 && (
                    <span className="ml-1.5 text-xs font-normal line-through text-ink4">${product.price.toFixed(2)}</span>
                  )}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => onMoveToCart(product)}
                    disabled={isPending}
                    className="rounded-md bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Move to cart
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(product)}
                    className="rounded-md border border-stroke px-2.5 py-1 text-[11px] font-medium text-ink4 transition-colors hover:text-red-400"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}

function getEstimatedDelivery() {
  const lo = new Date();
  const hi = new Date();
  lo.setDate(lo.getDate() + 3);
  hi.setDate(hi.getDate() + 7);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(lo)} – ${fmt(hi)}`;
}

export function CartPage() {
  usePageTitle("Cart");
  const { addItem, updateItem, removeItem, clearCart } = useCartMutations();
  const { wishlist, toggle } = useWishlist();
  const cartQuery = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: cartService.getCart,
  });

  // Saved-for-later: wishlist IDs not already in cart
  const cartItemProductIds = new Set((cartQuery.data?.items ?? []).map((i) => i.product_id));
  const savedIds = [...wishlist].filter((id) => !cartItemProductIds.has(id));
  const savedQueries = useQueries({
    queries: savedIds.map((id) => ({
      queryKey: queryKeys.product(id),
      queryFn: () => productService.getProduct(id),
      staleTime: 60_000,
    })),
  });
  const savedProducts = savedQueries.map((q) => q.data).filter(Boolean) as Product[];

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
  const shipProgress = Math.min((subtotal / FREE_SHIPPING_THRESHOLD) * 100, 100);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FREE_SHIPPING_FLAT_RATE;
  const total = subtotal + shipping;
  const outOfStockItems = items.filter((i) => i.product.stock !== undefined && i.product.stock === 0);
  const hasOutOfStock = outOfStockItems.length > 0;

  function handleSaveForLater(productId: string, itemId: string) {
    toggle(productId);
    removeItem.mutate(itemId);
    toast.success("Saved to wishlist");
  }

  if (items.length === 0) {
    const emptyHeader = (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-16 text-center">
        <div className="flex size-24 items-center justify-center rounded-2xl bg-raised text-ink4">
          <PackageIcon className="size-12" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-ink">Your cart is empty</h1>
        <p className="mt-2 text-sm text-ink4">
          {savedProducts.length > 0 ? "Move a saved item to cart, or browse for more." : "Add items from the shop to get started."}
        </p>
        <Link
          to="/products"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Browse products
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    );

    if (savedProducts.length === 0) return emptyHeader;

    // Cart empty but saved items exist — show both
    return (
      <div className="space-y-8">
        {emptyHeader}
        <SavedForLaterSection
          products={savedProducts}
          onMoveToCart={(product) => addItem.mutate(
            { productId: product.product_id, quantity: 1 },
            { onSuccess: () => toggle(product.product_id) },
          )}
          onRemove={(product) => toggle(product.product_id)}
          isPending={addItem.isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        className="flex items-start justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Your cart</h1>
          <p className="mt-1 text-sm text-ink4">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        </div>
        <ConfirmButton
          onConfirm={() => clearCart.mutate()}
          message="Remove all items from cart?"
          confirmLabel="Clear cart"
          className="mt-1 text-xs text-ink4 transition-colors hover:text-red-400"
          disabled={clearCart.isPending}
        >
          Clear all
        </ConfirmButton>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Items */}
        <motion.ul className="space-y-3 lg:col-span-2" variants={stagger} initial="hidden" animate="show">
          <AnimatePresence initial={false}>
            {items.map((line) => {
              const discountedPrice = line.product.discount && line.product.discount > 0
                ? line.product.price * (1 - line.product.discount / 100)
                : line.product.price;
              const isLowStock = line.product.stock !== undefined && line.product.stock > 0 && line.product.stock <= 5;
              const isOutOfStock = line.product.stock !== undefined && line.product.stock === 0;

              return (
                <motion.li
                  key={line.id}
                  variants={rowFade}
                  exit="exit"
                  layout
                  className="flex gap-4 rounded-xl border border-stroke bg-card p-4 transition-colors hover:border-edge"
                >
                  {/* Thumbnail */}
                  <Link
                    to={`/products/${line.product.product_id}`}
                    className="relative h-24 w-24 shrink-0 rounded-xl bg-raised"
                  >
                    <Img
                      src={productImageUrl(line.product)}
                      alt={line.product.name}
                      className="h-full w-full object-cover transition-transform hover:scale-105"
                      wrapperClassName="h-full w-full rounded-xl overflow-hidden"
                    />
                    {line.product.discount && line.product.discount > 0 ? (
                      <span className="absolute -right-1.5 -top-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow">
                        -{line.product.discount}%
                      </span>
                    ) : null}
                  </Link>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/products/${line.product.product_id}`}
                      className="line-clamp-2 font-medium text-ink transition-colors hover:text-emerald-400"
                    >
                      {line.product.name}
                    </Link>
                    {line.product.brand && (
                      <p className="mt-0.5 text-xs text-ink4">{line.product.brand}</p>
                    )}

                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums text-ink">
                        ${discountedPrice.toFixed(2)}
                      </span>
                      {line.product.discount && line.product.discount > 0 && (
                        <span className="text-xs line-through text-ink4">
                          ${line.product.price.toFixed(2)}
                        </span>
                      )}
                      {isLowStock && (
                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-500">
                          Only {line.product.stock} left
                        </span>
                      )}
                      {isOutOfStock && (
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                          Out of stock
                        </span>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <QuantityInput
                        value={line.quantity}
                        min={1}
                        max={line.product.stock ?? 99}
                        onChange={(q) => updateItem.mutate({ itemId: line.id, quantity: q })}
                        disabled={updateItem.isPending}
                      />

                      <button
                        type="button"
                        onClick={() => handleSaveForLater(line.product.product_id, line.id)}
                        className="flex items-center gap-1.5 text-sm text-ink4 transition-colors hover:text-emerald-500"
                      >
                        <HeartIcon className="size-3.5" />
                        Save for later
                      </button>

                      <button
                        type="button"
                        onClick={() => removeItem.mutate(line.id)}
                        disabled={removeItem.isPending}
                        className="flex items-center gap-1.5 text-sm text-ink4 transition-colors hover:text-red-400 disabled:opacity-50"
                      >
                        <TrashIcon className="size-3.5" />
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Line total */}
                  <div className="shrink-0 text-right">
                    <p className="font-semibold tabular-nums text-ink">
                      ${(discountedPrice * line.quantity).toFixed(2)}
                    </p>
                    {line.quantity > 1 && (
                      <p className="mt-0.5 text-[11px] tabular-nums text-ink4">
                        ${discountedPrice.toFixed(2)} × {line.quantity}
                      </p>
                    )}
                    {line.product.discount && line.product.discount > 0 && (
                      <p className="mt-0.5 text-[11px] text-emerald-500">
                        −${(line.product.price * (line.product.discount / 100) * line.quantity).toFixed(2)}
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

          {/* Free shipping progress */}
          <div className="space-y-2 rounded-xl border border-stroke bg-raised/40 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className={subtotal >= FREE_SHIPPING_THRESHOLD ? "font-medium text-emerald-400" : "text-ink3"}>
                {subtotal >= FREE_SHIPPING_THRESHOLD ? "Free shipping unlocked" : "Free shipping progress"}
              </span>
              <span className="tabular-nums text-ink4">${subtotal.toFixed(2)} / $50</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-well">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${shipProgress}%` }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
            {subtotal < FREE_SHIPPING_THRESHOLD ? (
              <p className="text-xs text-ink4">
                Add{" "}
                <span className="font-semibold text-ink">
                  ${(FREE_SHIPPING_THRESHOLD - subtotal).toFixed(2)}
                </span>{" "}
                more for free shipping
              </p>
            ) : (
              <p className="text-xs font-medium text-emerald-500">You qualify for free shipping!</p>
            )}
          </div>

          {/* Pricing breakdown */}
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-ink3">
              <span>Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})</span>
              <span className="tabular-nums text-ink">${subtotal.toFixed(2)}</span>
            </div>
            {totalSavings > 0.01 && (
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount savings</span>
                <span className="tabular-nums font-semibold">−${totalSavings.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink3">
              <span>Shipping</span>
              <span className={shipping === 0 ? "font-medium text-emerald-400" : "tabular-nums text-ink"}>
                {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="flex items-center justify-between text-ink3">
              <span>Tax</span>
              <span className="text-[11px] text-ink4">Calculated at checkout</span>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-stroke pt-3">
            <span className="font-semibold text-ink">Estimated total</span>
            <span className="text-lg font-bold tabular-nums text-ink">${total.toFixed(2)}</span>
          </div>

          {/* Estimated delivery */}
          <div className="flex items-center gap-2.5 rounded-lg border border-stroke bg-raised/50 px-3 py-2.5">
            <TruckIcon className="size-4 shrink-0 text-ink3" />
            <div>
              <p className="text-[11px] font-semibold text-ink2">Estimated delivery</p>
              <p className="text-[11px] text-ink4">{getEstimatedDelivery()}</p>
            </div>
          </div>

          {/* Out-of-stock warning */}
          {hasOutOfStock && (
            <div className="rounded-lg border border-red-500/25 bg-red-500/8 px-3.5 py-3">
              <p className="text-[12px] font-semibold text-red-500 dark:text-red-400">
                {outOfStockItems.length === 1
                  ? `"${outOfStockItems[0].product.name}" is out of stock`
                  : `${outOfStockItems.length} items are out of stock`}
              </p>
              <p className="mt-0.5 text-[11px] text-ink4">
                Remove out-of-stock items before checking out.
              </p>
            </div>
          )}

          {/* CTA */}
          {hasOutOfStock ? (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-well py-3.5 text-sm font-semibold text-ink4 opacity-60"
            >
              <LockClosedIcon className="size-3.5" />
              Proceed to checkout
            </button>
          ) : (
            <Link
              to="/checkout"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-[0.98]"
            >
              <LockClosedIcon className="size-3.5" />
              Proceed to checkout
            </Link>
          )}
          <Link
            to="/products"
            className="block text-center text-xs text-ink4 transition-colors hover:text-ink2"
          >
            Continue shopping
          </Link>

          {/* Trust badges */}
          <div className="space-y-2 border-t border-stroke pt-4">
            {[
              { icon: ShieldIcon, text: "Secure SSL checkout" },
              { icon: TruckIcon, text: "Free shipping on orders $50+" },
              { icon: TagIcon, text: "30-day hassle-free returns" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-ink4">
                <Icon className="size-4 shrink-0 text-ink3" />
                {text}
              </div>
            ))}
          </div>
        </motion.aside>
      </div>

      {savedProducts.length > 0 && (
        <SavedForLaterSection
          products={savedProducts}
          onMoveToCart={(product) => addItem.mutate(
            { productId: product.product_id, quantity: 1 },
            { onSuccess: () => toggle(product.product_id) },
          )}
          onRemove={(product) => toggle(product.product_id)}
          isPending={addItem.isPending}
        />
      )}
    </div>
  );
}
