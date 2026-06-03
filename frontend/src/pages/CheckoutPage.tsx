import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { productImageUrl } from "../lib/productImage";
import type { Address, Cart } from "../lib/types";
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, MapPinIcon,
  PackageIcon, ShieldIcon, TruckIcon,
} from "../components/Icons";

type CartRes    = { status: string; data: { cart: Cart } };
type AddressRes = { status: string; data: { address: Address[] } };

function AddressCard({
  address, selected, onSelect,
}: {
  address: Address; selected: boolean; onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-all ${
        selected
          ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/25"
          : "border-stroke bg-card hover:border-edge hover:bg-raised"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          selected ? "border-emerald-500 bg-emerald-500" : "border-edge"
        }`}>
          {selected && <CheckIcon className="size-2.5 text-white" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-ink">{address.street}</p>
          <p className="mt-0.5 text-xs text-ink4">
            {[address.city, address.state, address.zipCode, address.country].filter(Boolean).join(", ")}
          </p>
        </div>
      </div>
    </button>
  );
}

export function CheckoutPage() {
  usePageTitle("Checkout");
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const cartQuery = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await apiFetch<CartRes>("/api/v1/cart", { auth: true });
      return res.data.cart;
    },
  });

  const addressQuery = useQuery({
    queryKey: ["addresses"],
    queryFn: async () => {
      const res = await apiFetch<AddressRes>("/api/v1/addresses", { auth: true });
      return res.data.address ?? [];
    },
  });

  // Create a Stripe Checkout Session then redirect
  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ status: string; data: { url: string } }>(
        "/api/v1/payments/create-checkout-session",
        { method: "POST", auth: true },
      );
      return res.data.url;
    },
    onSuccess: (url) => {
      // Hard redirect to Stripe's hosted checkout page
      window.location.href = url;
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not start checkout. Please try again."),
  });

  const cart  = cartQuery.data;
  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, i) => {
    const price = i.product.discount && i.product.discount > 0
      ? i.product.price * (1 - i.product.discount / 100)
      : i.product.price;
    return sum + price * i.quantity;
  }, 0);
  const shipping = subtotal >= 50 ? 0 : 4.99;
  const total    = subtotal + shipping;

  if (cartQuery.isSuccess && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-24 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-raised text-ink4">
          <PackageIcon className="size-6" />
        </div>
        <p className="mt-5 font-semibold text-ink">Your cart is empty</p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div>
        <Link
          to="/cart"
          className="inline-flex items-center gap-1.5 text-sm text-ink4 transition-colors hover:text-ink2"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to cart
        </Link>
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Checkout
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">Review your order</h1>
        </div>
      </div>

      <div className="grid gap-7 lg:grid-cols-[1fr_360px]">

        {/* ── Left: delivery + items ── */}
        <div className="space-y-7">

          {/* Delivery address */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">1</div>
              <h2 className="text-base font-semibold text-ink">Delivery address</h2>
            </div>

            {addressQuery.isPending ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <div key={i} className="h-14 animate-shimmer rounded-xl" />)}
              </div>
            ) : addressQuery.data && addressQuery.data.length > 0 ? (
              <div className="space-y-2.5">
                {addressQuery.data.map((addr) => (
                  <AddressCard
                    key={addr.id}
                    address={addr}
                    selected={selectedAddressId === addr.id}
                    onSelect={() => setSelectedAddressId(addr.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-stroke bg-card py-8 text-center">
                <MapPinIcon className="size-7 text-ink4" />
                <p className="text-sm text-ink4">No saved addresses.</p>
                <Link
                  to="/account/addresses"
                  className="text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                >
                  Add an address →
                </Link>
              </div>
            )}

            <p className="mt-3 text-xs text-ink4">
              You can manage all delivery addresses in{" "}
              <Link to="/account/addresses" className="underline underline-offset-2 hover:text-ink3">
                account settings
              </Link>.
            </p>
          </section>

          {/* Order items */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">2</div>
              <h2 className="text-base font-semibold text-ink">
                Items
                <span className="ml-2 text-sm font-normal text-ink4">
                  ({items.length} item{items.length !== 1 ? "s" : ""})
                </span>
              </h2>
            </div>

            <div className="overflow-hidden rounded-2xl border border-stroke bg-card">
              {cartQuery.isPending
                ? [1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-4 border-b border-stroke last:border-b-0">
                      <div className="size-14 shrink-0 animate-shimmer rounded-xl" />
                      <div className="flex-1 space-y-2"><div className="h-3 w-3/4 animate-shimmer rounded" /><div className="h-3 w-1/4 animate-shimmer rounded" /></div>
                    </div>
                  ))
                : items.map((line) => {
                    const price = line.product.discount && line.product.discount > 0
                      ? line.product.price * (1 - line.product.discount / 100)
                      : line.product.price;
                    return (
                      <div key={line.id} className="flex items-center gap-3.5 px-4 py-3.5 border-b border-stroke last:border-b-0">
                        <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-raised">
                          <img
                            src={productImageUrl(line.product)}
                            alt={line.product.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{line.product.name}</p>
                          <p className="mt-0.5 text-xs text-ink4">Qty {line.quantity}</p>
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums text-ink">
                          ${(price * line.quantity).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
            </div>
          </section>

          {/* Payment note */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">3</div>
              <h2 className="text-base font-semibold text-ink">Payment</h2>
            </div>
            <div className="rounded-2xl border border-stroke bg-card px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ink">Powered by Stripe</p>
                  <p className="text-xs text-ink4">
                    You'll be taken to Stripe's secure checkout page to complete payment.
                    Supports cards, Apple Pay, Google Pay, and more.
                  </p>
                </div>
                {/* Stripe-style card logos */}
                <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  {["Visa", "MC", "Amex"].map((c) => (
                    <span key={c} className="rounded border border-edge px-1.5 py-0.5 text-[9px] font-bold text-ink4">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right: order summary + CTA ── */}
        <motion.aside
          className="h-fit overflow-hidden rounded-2xl border border-stroke bg-card"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <div className="border-b border-stroke px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Order summary</h2>
          </div>

          <div className="px-5 py-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink3">Subtotal</span>
              <span className="tabular-nums font-medium text-ink">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink3">Shipping</span>
              {shipping === 0 ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Free</span>
              ) : (
                <span className="tabular-nums font-medium text-ink">${shipping.toFixed(2)}</span>
              )}
            </div>
            {subtotal < 50 && (
              <p className="text-[11px] text-ink4">
                Add ${(50 - subtotal).toFixed(2)} more for free shipping
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-stroke bg-raised/40 px-5 py-4">
            <span className="text-sm font-semibold text-ink">Total</span>
            <span className="text-xl font-bold tabular-nums text-ink">${total.toFixed(2)}</span>
          </div>

          {/* Stripe checkout button */}
          <div className="px-5 pb-5 pt-3 space-y-3">
            <button
              type="button"
              disabled={checkoutMutation.isPending || cartQuery.isPending || items.length === 0}
              onClick={() => checkoutMutation.mutate()}
              className="group flex w-full items-center justify-center gap-2.5 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:shadow-emerald-500/30 disabled:opacity-50"
            >
              {checkoutMutation.isPending ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Redirecting to Stripe…
                </>
              ) : (
                <>
                  Pay ${total.toFixed(2)} with Stripe
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>

            {checkoutMutation.isError && (
              <p className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">
                {checkoutMutation.error instanceof ApiError
                  ? checkoutMutation.error.message
                  : "Something went wrong. Please try again."}
              </p>
            )}

            <div className="space-y-2 border-t border-stroke pt-3">
              {[
                { icon: ShieldIcon,  text: "256-bit SSL encryption" },
                { icon: TruckIcon,   text: "Free shipping over $50" },
                { icon: PackageIcon, text: "30-day easy returns" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-ink4">
                  <Icon className="size-3.5 shrink-0 text-ink3" />
                  {text}
                </div>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </motion.div>
  );
}
