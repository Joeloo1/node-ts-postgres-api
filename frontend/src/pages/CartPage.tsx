import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CartSkeleton } from "../components/ProductSkeleton";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { productImageUrl } from "../lib/productImage";
import type { Cart } from "../lib/types";
import { MinusIcon, PackageIcon, PlusIcon, ShieldIcon, TrashIcon, TruckIcon } from "../components/Icons";

type CartRes = { status: string; data: { cart: Cart } };

export function CartPage() {
  usePageTitle("Cart");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await apiFetch<CartRes>("/api/v1/cart", { auth: true });
      return res.data.cart;
    },
  });

  const updateQty = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      await apiFetch(`/api/v1/cart/items/${itemId}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ quantity }),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    onError: () => toast.error("Could not update quantity"),
  });

  const removeItem = useMutation({
    mutationFn: async (itemId: string) => {
      await apiFetch(`/api/v1/cart/items/${itemId}`, {
        method: "DELETE",
        auth: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Item removed");
    },
    onError: () => toast.error("Could not remove item"),
  });

  const placeOrder = useMutation({
    mutationFn: async (items: { product_id: string; quantity: number }[]) => {
      const res = await apiFetch<{ data: { order: { id: string } } }>("/api/v1/order", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ items }),
      });
      return res.data.order.id;
    },
    onSuccess: async () => {
      await apiFetch("/api/v1/cart", { method: "DELETE", auth: true });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order placed successfully!");
    },
    onError: () => toast.error("Could not place order. Please try again."),
  });

  if (cartQuery.isPending) return <CartSkeleton />;

  if (cartQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center">
        <p className="text-sm text-red-300">{(cartQuery.error as Error).message}</p>
      </div>
    );
  }

  const cart = cartQuery.data!;
  const items = cart.items ?? [];
  const subtotal = items.reduce((sum, i) => {
    const effectivePrice =
      i.product.discount && i.product.discount > 0
        ? i.product.price * (1 - i.product.discount / 100)
        : i.product.price;
    return sum + effectivePrice * i.quantity;
  }, 0);
  const SHIP_THRESHOLD = 50;
  const shipProgress = Math.min((subtotal / SHIP_THRESHOLD) * 100, 100);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-800/70 bg-zinc-900/30 py-20 text-center">
        <PackageIcon className="size-14 text-zinc-700" />
        <h1 className="mt-5 font-display text-2xl font-bold text-white">
          Your cart is empty
        </h1>
        <p className="mt-2 text-zinc-500">Add something from the shop to get started.</p>
        <Link
          to="/products"
          className="mt-8 inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Your cart</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {items.length} item{items.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Cart items */}
        <ul className="space-y-3 lg:col-span-2">
          {items.map((line) => (
            <li
              key={line.id}
              className="flex gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4 transition-colors hover:border-zinc-700"
            >
              <Link
                to={`/products/${line.product.product_id}`}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-zinc-900"
              >
                <img
                  src={productImageUrl(line.product)}
                  alt={line.product.name}
                  className="h-full w-full object-cover transition-transform hover:scale-105"
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/products/${line.product.product_id}`}
                  className="font-medium text-white transition-colors hover:text-emerald-400 line-clamp-2"
                >
                  {line.product.name}
                </Link>
                <p className="mt-0.5 text-sm tabular-nums text-zinc-500">
                  ${(line.product.discount && line.product.discount > 0
                    ? line.product.price * (1 - line.product.discount / 100)
                    : line.product.price
                  ).toFixed(2)} each
                  {line.product.discount && line.product.discount > 0 ? (
                    <span className="ml-1.5 text-xs line-through text-zinc-600">${line.product.price.toFixed(2)}</span>
                  ) : null}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {/* Qty stepper */}
                  <div className="flex items-center rounded-lg border border-zinc-700/80 bg-zinc-950">
                    <button
                      type="button"
                      onClick={() =>
                        updateQty.mutate({
                          itemId: line.id,
                          quantity: Math.max(1, line.quantity - 1),
                        })
                      }
                      disabled={updateQty.isPending}
                      className="px-2.5 py-1.5 text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      <MinusIcon className="size-3.5" />
                    </button>
                    <span className="w-8 select-none text-center text-sm font-semibold text-white">
                      {line.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateQty.mutate({
                          itemId: line.id,
                          quantity: Math.min(999, line.quantity + 1),
                        })
                      }
                      disabled={updateQty.isPending}
                      className="px-2.5 py-1.5 text-zinc-400 transition-colors hover:text-white disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      <PlusIcon className="size-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeItem.mutate(line.id)}
                    disabled={removeItem.isPending}
                    className="flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-red-400 disabled:opacity-50"
                  >
                    <TrashIcon className="size-3.5" />
                    Remove
                  </button>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-semibold tabular-nums text-white">
                  ${((line.product.discount && line.product.discount > 0
                    ? line.product.price * (1 - line.product.discount / 100)
                    : line.product.price) * line.quantity).toFixed(2)}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Order summary */}
        <aside className="h-fit space-y-5 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-6">
          <h2 className="font-display text-lg font-semibold text-white">Order summary</h2>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal ({items.length} item{items.length !== 1 ? "s" : ""})</span>
              <span className="tabular-nums text-white">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Shipping</span>
              <span className="text-emerald-400">
                {subtotal >= 50 ? "Free" : "$4.99"}
              </span>
            </div>
          </div>

          <div className="flex justify-between border-t border-zinc-800/60 pt-3 text-base font-semibold text-white">
            <span>Total</span>
            <span className="tabular-nums">
              ${(subtotal + (subtotal >= 50 ? 0 : 4.99)).toFixed(2)}
            </span>
          </div>

          {/* Shipping progress bar */}
          <div className="space-y-2 rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
            <div className="flex justify-between text-xs">
              <span className={subtotal >= SHIP_THRESHOLD ? "font-medium text-emerald-400" : "text-zinc-400"}>
                {subtotal >= SHIP_THRESHOLD ? "🎉 Free shipping unlocked!" : "Free shipping progress"}
              </span>
              <span className="tabular-nums text-zinc-500">${subtotal.toFixed(2)} / $50</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${shipProgress}%` }}
                transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
              />
            </div>
            {subtotal < SHIP_THRESHOLD && (
              <p className="text-xs text-zinc-500">
                Add <span className="font-semibold text-white">${(SHIP_THRESHOLD - subtotal).toFixed(2)}</span> more for free shipping
              </p>
            )}
          </div>

          {placeOrder.isError && (
            <p className="rounded-xl border border-red-900/40 bg-red-950/30 px-3 py-2 text-sm text-red-300">
              {placeOrder.error instanceof ApiError
                ? placeOrder.error.message
                : "Order failed — try again"}
            </p>
          )}

          <button
            type="button"
            disabled={placeOrder.isPending}
            onClick={() =>
              placeOrder.mutate(
                items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
                { onSuccess: (orderId) => navigate(`/orders/${orderId}`) },
              )
            }
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {placeOrder.isPending ? "Placing order…" : "Place order"}
          </button>

          <Link
            to="/products"
            className="block text-center text-xs text-zinc-500 transition-colors hover:text-zinc-300"
          >
            Continue shopping
          </Link>

          {/* Trust badges */}
          <div className="space-y-2 border-t border-zinc-800/60 pt-4">
            {[
              { icon: ShieldIcon, text: "Secure checkout" },
              { icon: TruckIcon, text: "Free shipping over $50" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-zinc-500">
                <Icon className="size-4 shrink-0 text-zinc-400" />
                {text}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
