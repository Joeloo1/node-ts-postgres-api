import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { ApiError, apiFetch } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { FREE_SHIPPING_THRESHOLD, FREE_SHIPPING_FLAT_RATE, COUNTRIES } from "../lib/constants";
import { formatPostalCode } from "../lib/formatters";
import * as cartService from "../services/cart";
import * as addressService from "../services/addresses";
import * as couponService from "../services/coupons";
import * as giftCardService from "../services/giftCards";
import * as loyaltyService from "../services/loyalty";
import type { CouponValidateResult } from "../services/coupons";
import { productImageUrl } from "../lib/productImage";
import { formatPrice } from "../lib/pricing";
import type { Address } from "../lib/types";
import {
  ArrowLeftIcon, ArrowRightIcon, CheckIcon, MapPinIcon,
  PackageIcon, PlusIcon, ShieldIcon, TruckIcon, StarIcon,
} from "../components/Icons";

/* ── Types ───────────────────────────────────────────────────────────────── */

interface ShippingRate {
  id: string;
  carrier: string;
  service: string;
  rate: number;
  deliveryDays: number | null;
  free: boolean;
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function CheckoutStepper({ addressDone, itemsDone }: { addressDone: boolean; itemsDone: boolean }) {
  const steps = [
    { label: "Address", done: addressDone },
    { label: "Items",   done: itemsDone },
    { label: "Payment", done: false },
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
              <div className={`flex size-8 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                isDone
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : isActive
                  ? "border-2 border-emerald-600 bg-emerald-600/10 text-emerald-600 dark:text-emerald-400"
                  : "border-2 border-stroke bg-card text-ink4"
              }`}>
                {isDone ? (
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : i + 1}
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

function Spinner() {
  return (
    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

const inputClass = "w-full rounded-lg border border-stroke bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition-colors";

/* ── Main page ───────────────────────────────────────────────────────────── */

export function CheckoutPage() {
  usePageTitle("Checkout");
  const queryClient = useQueryClient();
  const { token } = useAuth();

  /* Address */
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newZip, setNewZip] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [saveAddressForNextTime, setSaveAddressForNextTime] = useState(false);
  const [touchedStreet, setTouchedStreet] = useState(false);
  const [touchedCity, setTouchedCity] = useState(false);

  /* Coupon */
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidateResult | null>(null);
  const couponInputRef = useRef<HTMLInputElement>(null);

  /* Gift card */
  const [giftCardInput, setGiftCardInput] = useState("");
  const [appliedGiftCard, setAppliedGiftCard] = useState<{ code: string; discount: number } | null>(null);
  const [checkingGiftCard, setCheckingGiftCard] = useState(false);

  /* Loyalty */
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  /* Shipping rates */
  const [shippingRates, setShippingRates] = useState<ShippingRate[]>([]);
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);
  const [loadingRates, setLoadingRates] = useState(false);

  /* Queries */
  const cartQuery = useQuery({ queryKey: queryKeys.cart(), queryFn: cartService.getCart });
  const addressQuery = useQuery({ queryKey: queryKeys.addresses(), queryFn: addressService.getAddresses });
  const loyaltyQuery = useQuery({
    queryKey: queryKeys.loyalty(),
    queryFn: loyaltyService.getMyLoyalty,
    enabled: Boolean(token),
  });

  /* Auto-select default address */
  useEffect(() => {
    if (!addressQuery.data || selectedAddressId) return;
    const def = addressQuery.data.find((a) => a.isDefault) ?? addressQuery.data[0];
    if (def) setSelectedAddressId(def.id);
  }, [addressQuery.data, selectedAddressId]);

  /* Fetch shipping rates when address + cart are ready */
  useEffect(() => {
    if (!selectedAddressId || !addressQuery.data || !cartQuery.data) return;
    const addr = addressQuery.data.find((a) => a.id === selectedAddressId);
    if (!addr) return;

    const country = (addr.country ?? "").trim();
    const cartTotal = cartQuery.data.items?.reduce((sum, i) => {
      const price = i.product.discount && i.product.discount > 0
        ? i.product.price * (1 - i.product.discount / 100)
        : i.product.price;
      return sum + price * i.quantity;
    }, 0) ?? 0;

    setLoadingRates(true);
    setShippingRates([]);
    setSelectedRateId(null);

    apiFetch<{ data: { rates: ShippingRate[] } }>("/api/v1/shipping/rates", {
      method: "POST",
      body: JSON.stringify({ country: country || "US", zip: addr.zipCode ?? undefined, cartTotal }),
    })
      .then((res) => {
        const rates = res.data?.rates ?? [];
        setShippingRates(rates);
        if (rates.length > 0) setSelectedRateId(rates[0].id);
      })
      .catch(() => {
        /* silently fall back to flat-rate */
      })
      .finally(() => setLoadingRates(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddressId, addressQuery.data]);

  /* Mutations */
  const addAddressMutation = useMutation({
    mutationFn: () =>
      addressService.createAddress({
        street: newStreet, city: newCity,
        state: newState || null, zipCode: newZip || null, country: newCountry || null,
        isDefault: saveAddressForNextTime,
      }),
    onSuccess: (addr) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.addresses() });
      setSelectedAddressId(addr.id);
      setShowAddressForm(false);
      setNewStreet(""); setNewCity(""); setNewState(""); setNewZip(""); setNewCountry("");
      setTouchedStreet(false); setTouchedCity(false); setSaveAddressForNextTime(false);
      toast.success(saveAddressForNextTime ? "Address saved to your account" : "Address added");
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
      const body: Record<string, unknown> = {};
      if (appliedCoupon?.code) body.couponCode = appliedCoupon.code;
      if (appliedGiftCard?.code) body.giftCardCode = appliedGiftCard.code;
      if (pointsToRedeem >= 100) body.pointsToRedeem = pointsToRedeem;

      const res = await apiFetch<{ status: string; data: { url: string } }>(
        "/api/v1/payments/create-checkout-session",
        { method: "POST", body: JSON.stringify(body) },
      );
      return res.data.url;
    },
    onSuccess: (url) => { window.location.href = url; },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not start checkout. Please try again."),
  });

  /* Calculations */
  const cart = cartQuery.data;
  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, i) => {
    const price = i.product.discount && i.product.discount > 0
      ? i.product.price * (1 - i.product.discount / 100)
      : i.product.price;
    return sum + price * i.quantity;
  }, 0);

  const couponDiscount = appliedCoupon?.discount ?? 0;
  const giftCardDiscount = appliedGiftCard?.discount ?? 0;
  const loyaltyDiscount = pointsToRedeem >= 100 ? Math.floor(pointsToRedeem / 100) : 0;
  const totalDiscounts = couponDiscount + giftCardDiscount + loyaltyDiscount;
  const discountedSubtotal = Math.max(0, subtotal - totalDiscounts);

  const selectedRate = shippingRates.find((r) => r.id === selectedRateId);
  const shipping = selectedRate
    ? selectedRate.rate
    : discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : FREE_SHIPPING_FLAT_RATE;

  const total = discountedSubtotal + shipping;

  /* Gift card apply */
  async function applyGiftCard() {
    const code = giftCardInput.trim().toUpperCase();
    if (!code) return;
    setCheckingGiftCard(true);
    try {
      const balance = await giftCardService.checkGiftCardBalance(code);
      if (!balance.active || balance.balance <= 0) {
        toast.error(balance.active ? "This gift card has no remaining balance." : "This gift card is no longer active.");
        return;
      }
      const discount = Math.min(balance.balance, total);
      setAppliedGiftCard({ code, discount });
      toast.success(`Gift card applied — ${formatPrice(discount)} off`);
      setGiftCardInput("");
    } catch (err) {
      toast.error(err instanceof ApiError && err.status === 404
        ? "Gift card not found. Please check the code."
        : "Could not verify gift card. Please try again.");
    } finally {
      setCheckingGiftCard(false);
    }
  }

  /* Loyalty helpers */
  const loyaltyBalance = loyaltyQuery.data?.points ?? 0;
  const maxRedeemable = Math.min(loyaltyBalance, Math.floor(total) * 100);
  const redeemableSteps = Math.floor(maxRedeemable / 100);

  /* Empty cart */
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

          {/* Step 1 — Delivery address */}
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
                  <div className="space-y-1">
                    <input
                      value={newStreet}
                      onChange={(e) => setNewStreet(e.target.value)}
                      onBlur={() => setTouchedStreet(true)}
                      placeholder="Street address *"
                      className={`${inputClass} ${touchedStreet && !newStreet.trim() ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/15" : ""}`}
                      required
                      autoComplete="street-address"
                    />
                    {touchedStreet && !newStreet.trim() && (
                      <p className="text-xs text-red-400">Street address is required</p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <input
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        onBlur={() => setTouchedCity(true)}
                        placeholder="City *"
                        className={`${inputClass} ${touchedCity && !newCity.trim() ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/15" : ""}`}
                        required
                        autoComplete="address-level2"
                      />
                      {touchedCity && !newCity.trim() && (
                        <p className="text-xs text-red-400">City is required</p>
                      )}
                    </div>
                    <input value={newState} onChange={(e) => setNewState(e.target.value)} placeholder="State / Province" className={inputClass} autoComplete="address-level1" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input value={newZip} onChange={(e) => setNewZip(formatPostalCode(e.target.value, newCountry))} placeholder="Zip / Postal code" className={inputClass} autoComplete="postal-code" />
                    <select
                      value={newCountry}
                      onChange={(e) => setNewCountry(e.target.value)}
                      className={inputClass}
                      autoComplete="country"
                    >
                      <option value="">Country…</option>
                      {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Save address checkbox */}
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={saveAddressForNextTime}
                      onChange={(e) => setSaveAddressForNextTime(e.target.checked)}
                      className="size-4 cursor-pointer rounded accent-emerald-600"
                    />
                    <span className="text-[13px] text-ink3">Save this address for next time</span>
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      disabled={!newStreet.trim() || !newCity.trim() || addAddressMutation.isPending}
                      onClick={() => addAddressMutation.mutate()}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50 w-full sm:w-auto"
                    >
                      {addAddressMutation.isPending ? "Saving…" : "Use this address"}
                    </button>
                    {showAddressForm && addressQuery.data && addressQuery.data.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="inline-flex items-center justify-center rounded-lg border border-stroke bg-card px-4 py-2.5 text-sm font-semibold text-ink2 transition-colors hover:bg-raised w-full sm:w-auto"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Step 2 — Shipping method */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-sm shadow-emerald-500/40">2</div>
              <h2 className="text-base font-semibold text-ink">Shipping method</h2>
            </div>

            {loadingRates ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-14 animate-pulse rounded-xl border border-stroke bg-card" />
                ))}
              </div>
            ) : shippingRates.length > 0 ? (
              <div className="space-y-2">
                {shippingRates.map((rate) => (
                  <button
                    key={rate.id}
                    type="button"
                    onClick={() => setSelectedRateId(rate.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all ${
                      selectedRateId === rate.id
                        ? "border-emerald-500/40 bg-emerald-500/5 ring-1 ring-emerald-500/25"
                        : "border-stroke bg-card hover:border-edge hover:bg-raised"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${selectedRateId === rate.id ? "border-emerald-500 bg-emerald-500" : "border-edge"}`}>
                        {selectedRateId === rate.id && <CheckIcon className="size-2.5 text-white" />}
                      </div>
                      <div className="flex flex-1 items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-ink">{rate.service}</p>
                          <p className="text-xs text-ink4">
                            {rate.carrier}{rate.deliveryDays ? ` · ${rate.deliveryDays} business day${rate.deliveryDays !== 1 ? "s" : ""}` : ""}
                          </p>
                        </div>
                        <p className={`text-sm font-bold tabular-nums ${rate.free ? "text-emerald-600 dark:text-emerald-400" : "text-ink"}`}>
                          {rate.free || rate.rate === 0 ? "Free" : formatPrice(rate.rate)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-stroke bg-card px-4 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <TruckIcon className="size-4 text-ink4" />
                  <div>
                    <p className="text-sm font-medium text-ink">Standard shipping</p>
                    {!selectedAddressId && <p className="text-xs text-ink4">Select an address to see shipping options</p>}
                  </div>
                </div>
                <p className={`text-sm font-bold ${discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? "text-emerald-600 dark:text-emerald-400" : "text-ink"}`}>
                  {discountedSubtotal >= FREE_SHIPPING_THRESHOLD ? "Free" : formatPrice(FREE_SHIPPING_FLAT_RATE)}
                </p>
              </div>
            )}
          </section>

          {/* Step 3 — Order items */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-sm shadow-emerald-500/40">3</div>
                <h2 className="text-base font-semibold text-ink">
                  Items <span className="ml-1.5 text-sm font-normal text-ink4">({items.length} item{items.length !== 1 ? "s" : ""})</span>
                </h2>
              </div>
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

          {/* Step 4 — Payment */}
          <section>
            <div className="mb-4 flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-sm shadow-emerald-500/40">4</div>
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

        {/* ── Order summary sidebar ─────────────────────────────────────── */}
        <motion.aside
          className="sticky top-24 h-fit overflow-hidden rounded-2xl border border-stroke bg-card"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <div className="border-b border-stroke px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Order summary</h2>
          </div>

          {/* Line items */}
          <div className="px-5 py-4 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-ink3">Subtotal</span>
              <span className="tabular-nums font-medium text-ink">{formatPrice(subtotal)}</span>
            </div>

            <AnimatePresence>
              {appliedCoupon && (
                <motion.div className="flex justify-between" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6M9.75 9.75h.008v.008H9.75V9.75Zm4.5 4.5h.008v.008h-.008v-.008ZM5.25 6.375A2.625 2.625 0 0 1 7.875 3.75h10.5A2.625 2.625 0 0 1 21 6.375v10.5A2.625 2.625 0 0 1 18.375 19.5H7.875a2.625 2.625 0 0 1-2.625-2.625v-10.5Z" />
                    </svg>
                    {appliedCoupon.code}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">-{formatPrice(couponDiscount)}</span>
                    <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-ink4 hover:text-red-400 transition-colors" aria-label="Remove coupon">
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </motion.div>
              )}

              {appliedGiftCard && (
                <motion.div className="flex justify-between" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                    </svg>
                    Gift card
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">-{formatPrice(giftCardDiscount)}</span>
                    <button type="button" onClick={() => setAppliedGiftCard(null)} className="text-ink4 hover:text-red-400 transition-colors" aria-label="Remove gift card">
                      <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </motion.div>
              )}

              {loyaltyDiscount > 0 && (
                <motion.div className="flex justify-between" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <StarIcon className="size-3.5" filled />
                    {pointsToRedeem.toLocaleString()} pts
                  </span>
                  <span className="tabular-nums font-medium text-emerald-600 dark:text-emerald-400">-{formatPrice(loyaltyDiscount)}</span>
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
            {shippingRates.length === 0 && discountedSubtotal < FREE_SHIPPING_THRESHOLD && (
              <p className="text-[11px] text-ink4">
                Add {formatPrice(FREE_SHIPPING_THRESHOLD - discountedSubtotal)} more for free shipping
              </p>
            )}
          </div>

          {/* Coupon */}
          <div className="border-t border-stroke px-5 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink4">Promo code</p>
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2">
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{appliedCoupon.code}</span>
                <button type="button" onClick={() => { setAppliedCoupon(null); setCouponCode(""); }} className="text-xs text-ink4 hover:text-red-400 transition-colors">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  ref={couponInputRef}
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter" && couponCode.trim()) couponMutation.mutate(); }}
                  placeholder="Enter code"
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
                  {couponMutation.isPending ? <Spinner /> : "Apply"}
                </button>
              </div>
            )}
          </div>

          {/* Gift card */}
          <div className="border-t border-stroke px-5 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink4">Gift card</p>
            {appliedGiftCard ? (
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2">
                <span className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">{appliedGiftCard.code}</span>
                <button type="button" onClick={() => setAppliedGiftCard(null)} className="text-xs text-ink4 hover:text-red-400 transition-colors">Remove</button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={giftCardInput}
                  onChange={(e) => setGiftCardInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => { if (e.key === "Enter" && giftCardInput.trim()) applyGiftCard(); }}
                  placeholder="Gift card code"
                  className="flex-1 rounded-lg border border-stroke bg-input px-3 py-2 font-mono text-sm uppercase tracking-wider text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition-colors"
                  autoComplete="off"
                />
                <button
                  type="button"
                  disabled={!giftCardInput.trim() || checkingGiftCard}
                  onClick={applyGiftCard}
                  className="shrink-0 rounded-lg border border-stroke bg-raised px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-hover disabled:opacity-40"
                >
                  {checkingGiftCard ? <Spinner /> : "Apply"}
                </button>
              </div>
            )}
          </div>

          {/* Loyalty points */}
          {token && loyaltyBalance > 0 && redeemableSteps > 0 && (
            <div className="border-t border-stroke px-5 py-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Loyalty points</p>
                <span className="text-[11px] text-ink4">{loyaltyBalance.toLocaleString()} available</span>
              </div>
              <div className="rounded-lg border border-stroke bg-input p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink3">Redeem points</span>
                  <span className="font-semibold text-ink">{pointsToRedeem.toLocaleString()} pts = {formatPrice(Math.floor(pointsToRedeem / 100))}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={redeemableSteps}
                  step={1}
                  value={pointsToRedeem / 100}
                  onChange={(e) => setPointsToRedeem(Number(e.target.value) * 100)}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-ink4">
                  <span>0</span>
                  <span>{(redeemableSteps * 100).toLocaleString()} pts max</span>
                </div>
              </div>
            </div>
          )}

          {/* Total + CTA */}
          <div className="flex items-center justify-between border-t border-stroke bg-raised/40 px-5 py-4">
            <span className="text-sm font-semibold text-ink">Total</span>
            <span className="text-xl font-bold tabular-nums text-ink">{formatPrice(total)}</span>
          </div>

          <div className="px-5 pb-5 pt-3 space-y-3">
            <button
              type="button"
              disabled={checkoutMutation.isPending || cartQuery.isPending || items.length === 0 || !selectedAddressId}
              onClick={() => checkoutMutation.mutate()}
              className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-md shadow-emerald-500/20 transition-all hover:bg-emerald-700 hover:shadow-emerald-500/30 disabled:opacity-50"
            >
              {!checkoutMutation.isPending && (
                <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
              )}
              {checkoutMutation.isPending ? (
                <><Spinner />Redirecting to Stripe…</>
              ) : (
                <>Pay {formatPrice(total)} with Stripe<ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" /></>
              )}
            </button>

            {!selectedAddressId && (
              <p className="text-center text-xs text-amber-600 dark:text-amber-400">Add a delivery address to continue</p>
            )}

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
