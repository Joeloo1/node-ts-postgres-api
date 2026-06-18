import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_FLAT_RATE } from "../lib/constants";
import * as cartService from "../services/cart";
import * as addressService from "../services/addresses";
import * as couponService from "../services/coupons";
import type { CouponValidateResult } from "../services/coupons";
import { productImageUrl } from "../lib/productImage";
import { formatPrice } from "../lib/pricing";
import type { Address } from "../lib/types";
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, MapPinIcon,
  PackageIcon, PlusIcon, ShieldIcon, TruckIcon,
} from "../components/Icons";

function CheckoutStepper({ addressDone, itemsDone }: { addressDone: boolean; itemsDone: boolean }) {
  const steps = [
    { label: "Address",  done: addressDone },
    { label: "Items",    done: itemsDone },
    { label: "Payment",  done: false },
  ];
  const activeIndex = steps.findIndex((s) => !s.done);
  const current = activeIndex === -1 ? steps.length - 1 : activeIndex;

  return (
    <nav aria-label="Checkout progress" className="flex items-center gap-0">
      {steps.map((step, i) => {
        const isDone = step.done;
        const isActive = i === current;
        return (
          <div key={step.label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                  isDone
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : isActive
                    ? "border-2 border-emerald-600 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400"
                    : "border-2 border-stroke bg-card text-ink4"
                }`}
              >
                {isDone ? (
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`hidden sm:block text-[11px] font-medium ${isActive ? "text-ink" : isDone ? "text-emerald-600 dark:text-emerald-400" : "text-ink4"}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`mx-2 h-px flex-1 transition-colors ${isDone ? "bg-emerald-500/50" : "bg-stroke"}`} />
            )}
          </div>
        );
      })}
    </nav>
  );
}

function AddressCard({ address, selected, onSelect }: { address: Address; selected: boolean; onSelect: () => void }) {
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
        <div className={`mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selected ? "border-emerald-500 bg-emerald-500" : "border-edge"}`}>
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

const inputClass = "w-full rounded-lg border border-stroke bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition-colors";

export function CheckoutPage() {
  usePageTitle("Checkout");
  const queryClient = useQueryClient();
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidateResult | null>(null);
  const couponInputRef = useRef<HTMLInputElement>(null);

  /* Fix #3 — correct address endpoint */
  const cartQuery = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: cartService.getCart,
  });

  const addressQuery = useQuery({
    queryKey: queryKeys.addresses(),
    queryFn: addressService.getAddresses,
  });

  useEffect(() => {
    if (!addressQuery.data || selectedAddressId) return;
    const def = addressQuery.data.find((a) => a.isDefault) ?? addressQuery.data[0];
    if (def) setSelectedAddressId(def.id);
  }, [addressQuery.data, selectedAddressId]);

  /* Fix #6 — inline add address form */
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newZip, setNewZip] = useState("");
  const [newCountry, setNewCountry] = useState("");

  const addAddressMutation = useMutation({
    mutationFn: () =>
      addressService.createAddress({
        street: newStreet, city: newCity,
        state: newState || null, zipCode: newZip || null, country: newCountry || null,
        isDefault: false,
      }),
    onSuccess: (addr) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses() });
      setSelectedAddressId(addr.id);
      setShowAddressForm(false);
      setNewStreet(""); setNewCity(""); setNewState(""); setNewZip(""); setNewCountry("");
      toast.success("Address saved");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not save address"),
  });

  const couponMutation = useMutation({
    mutationFn: () => couponService.validateCoupon(couponCode.trim().toUpperCase(), subtotal),
    onSuccess: (result) => {
      setAppliedCoupon(result);
      toast.success(`Coupon applied — ${formatPrice(result.discount)} off`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Invalid coupon code"),
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ status: string; data: { url: string } }>(
        "/api/v1/payments/create-checkout-session",
        { method: "POST", auth: true },
      );
      return res.data.url;
    },
    onSuccess: (url) => { window.location.href = url; },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not start checkout. Please try again."),
  });

  const cart = cartQuery.data;
  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, i) => {
    const price = i.product.discount && i.product.discount > 0
      ? i.product.price * (1 - i.product.discount / 100)
      : i.product.price;
    return sum + price * i.quantity;
  }, 0);
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const discountedSubtotal = subtotal - couponDiscount;
  const shipping = discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FREE_SHIPPING_FLAT_RATE;
  const total = discountedSubtotal + shipping;

  if (cartQuery.isSuccess && items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-24 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-raised text-ink4">
          <PackageIcon className="size-6" />
        </div>
        <p className="mt-5 font-semibold text-ink">Your cart is empty</p>
        <Link to="/products" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Header */}
      <div>
        <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-ink4 transition-colors hover:text-ink2">
          <ArrowLeftIcon className="size-3.5" />
          Back to cart
        </Link>
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Checkout</p>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">Review your order</h1>
        </div>
      </div>

      {/* Progress stepper */}
      <CheckoutStepper addressDone={Boolean(selectedAddressId)} itemsDone={items.length > 0} />

      <div className="grid gap-7 lg:grid-cols-[1fr_360px]">
        <div className="space-y-7">

          {/* Delivery address */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-sm shadow-emerald-500/40">1</div>
              <h2 className="text-base font-semibold text-ink">Delivery address</h2>
            </div>

            {addressQuery.isPending ? (
              <div className="space-y-2">{[1, 2].map((i) => <div key={i} className="h-14 animate-shimmer rounded-xl" />)}</div>
            ) : addressQuery.data && addressQuery.data.length > 0 && !showAddressForm ? (
              <div className="space-y-2.5">
                {addressQuery.data.map((addr) => (
                  <AddressCard key={addr.id} address={addr} selected={selectedAddressId === addr.id} onSelect={() => setSelectedAddressId(addr.id)} />
                ))}
                <button
                  type="button"
                  onClick={() => setShowAddressForm(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors"
                >
                  <PlusIcon className="size-3.5" />
                  Add new address
                </button>
              </div>
            ) : (
              /* Fix #6 — inline add address form */
              <div className="space-y-3 rounded-2xl border border-stroke bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="size-4 text-ink4" />
                    <p className="text-sm font-semibold text-ink">
                      {showAddressForm ? "New address" : "No saved addresses"}
                    </p>
                  </div>
                  {showAddressForm && addressQuery.data && addressQuery.data.length > 0 && (
                    <button type="button" onClick={() => setShowAddressForm(false)} className="text-xs font-medium text-ink4 hover:text-ink transition-colors">
                      Cancel
                    </button>
                  )}
                </div>
                <p className="text-xs text-ink4">Add a delivery address to continue.</p>
                <div className="space-y-3">
                  <input value={newStreet} onChange={(e) => setNewStreet(e.target.value)} placeholder="Street address *" className={inputClass} required autoComplete="street-address" />
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="City *" className={inputClass} required autoComplete="address-level2" />
                    <input value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="State / Province" className={inputClass} autoComplete="address-level1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newZip} onChange={(e) => setNewZip(e.target.value)} placeholder="Zip / Postal code" className={inputClass} autoComplete="postal-code" />
                    <input value={newCountry} onChange={(e) => setNewCountry(e.target.value)} placeholder="Country" className={inputClass} autoComplete="country-name" />
                  </div>
                  <button
                    type="button"
                    disabled={!newStreet.trim() || !newCity.trim() || addAddressMutation.isPending}
                    onClick={() => addAddressMutation.mutate()}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {addAddressMutation.isPending ? "Saving…" : "Save address"}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Order items — Fix #30: Edit cart shortcut */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-sm shadow-emerald-500/40">2</div>
                <h2 className="text-base font-semibold text-ink">
                  Items <span className="ml-1.5 text-sm font-normal text-ink4">({items.length} item{items.length !== 1 ? "s" : ""})</span>
                </h2>
              </div>
              {/* Fix #30 */}
              <Link to="/cart" className="text-[12px] font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors">
                Edit cart
              </Link>
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
                          <img src={productImageUrl(line.product)} alt={line.product.name} className="h-full w-full object-cover" loading="lazy" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">{line.product.name}</p>
                          <p className="mt-0.5 text-xs text-ink4">Qty {line.quantity}</p>
                        </div>
                        <p className="shrink-0 text-sm font-bold tabular-nums text-ink">${(price * line.quantity).toFixed(2)}</p>
                      </div>
                    );
                  })}
            </div>
          </section>

          {/* Payment note */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-sm shadow-emerald-500/40">3</div>
              <h2 className="text-base font-semibold text-ink">Payment</h2>
            </div>
            <div className="rounded-2xl border border-stroke bg-card px-5 py-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-ink">Powered by Stripe</p>
                  <p className="text-xs text-ink4">
                    You'll be taken to Stripe's secure checkout page. Supports cards, Apple Pay, Google Pay, and more.
                  </p>
                </div>
                <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  {["Visa", "MC", "Amex"].map((c) => (
                    <span key={c} className="rounded-md border border-stroke bg-raised px-2 py-1 text-[9px] font-bold text-ink3 shadow-sm">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Order summary */}
        <motion.aside
          className="sticky top-24 h-fit overflow-hidden rounded-2xl border border-stroke bg-card"
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
              <span className="tabular-nums font-medium text-ink">{formatPrice(subtotal)}</span>
            </div>
            <AnimatePresence>
              {appliedCoupon && (
                <motion.div
                  className="flex justify-between"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6M9.75 9.75h.008v.008H9.75V9.75Zm4.5 4.5h.008v.008h-.008v-.008Zm-9.22 5.47A2.25 2.25 0 0 0 6.75 15.75V5.25A2.25 2.25 0 0 1 9 3h10.5A2.25 2.25 0 0 1 21.75 5.25v10.5A2.25 2.25 0 0 1 19.5 18H9a2.25 2.25 0 0 1-1.97-1.28Z" />
                    </svg>
                    {appliedCoupon.code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                      -{formatPrice(appliedCoupon.discount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                      className="text-ink4 hover:text-red-400 transition-colors"
                      aria-label="Remove coupon"
                    >
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex justify-between">
              <span className="text-ink3">Shipping</span>
              {shipping === 0 ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Free</span>
              ) : (
                <span className="tabular-nums font-medium text-ink">{formatPrice(shipping)}</span>
              )}
            </div>
            {discountedSubtotal < FREE_SHIPPING_THRESHOLD && (
              <p className="text-[11px] text-ink4">Add {formatPrice(FREE_SHIPPING_THRESHOLD - discountedSubtotal)} more for free shipping</p>
            )}
          </div>

          {/* Coupon / promo code */}
          <div className="border-t border-stroke px-5 py-3">
            {appliedCoupon ? null : (
              <div className="flex gap-2">
                <input
                  ref={couponInputRef}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter" && couponCode.trim()) couponMutation.mutate(); }}
                  placeholder="Promo code"
                  className="flex-1 rounded-lg border border-stroke bg-input px-3 py-2 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition-colors"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  disabled={!couponCode.trim() || couponMutation.isPending}
                  onClick={() => couponMutation.mutate()}
                  className="shrink-0 rounded-lg border border-stroke bg-raised px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-hover disabled:opacity-40"
                >
                  {couponMutation.isPending ? (
                    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  ) : "Apply"}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-stroke bg-raised/40 px-5 py-4">
            <span className="text-sm font-semibold text-ink">Total</span>
            <span className="text-xl font-bold tabular-nums text-ink">{formatPrice(total)}</span>
          </div>

          <div className="px-5 pb-5 pt-3 space-y-3">
            <button
              type="button"
              disabled={checkoutMutation.isPending || cartQuery.isPending || items.length === 0}
              onClick={() => checkoutMutation.mutate()}
              className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:shadow-emerald-500/30 disabled:opacity-50"
            >
              {!checkoutMutation.isPending && (
                <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
              )}
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
                  Pay {formatPrice(total)} with Stripe
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
