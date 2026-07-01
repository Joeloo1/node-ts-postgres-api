import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { PackageIcon, SearchIcon, CheckCircleIcon, TruckIcon, ClockIcon } from "../components/Icons";
import { ApiError, apiFetch } from "../lib/api";

type TrackResult = {
  orderId: string;
  status: string;
  estimatedDelivery: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  items: number;
  total: number;
};

const STATUS_STEPS = [
  { key: "PENDING", label: "Order placed" },
  { key: "PAID", label: "Payment confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "DELIVERED", label: "Delivered" },
];

function getStepIndex(status: string): number {
  const idx = STATUS_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

export function TrackOrderPage() {
  usePageTitle("Track Order");

  const [email, setEmail] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !orderId.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const params = new URLSearchParams({ orderId: orderId.trim(), email: email.trim() });
      const res = await apiFetch<{ data: TrackResult }>(`/api/v1/orders/track?${params}`);
      setResult(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error("Order not found. Please check your order ID and email address.");
      } else if (err instanceof ApiError && err.status === 403) {
        toast.error("The email address doesn't match this order.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const currentStep = result ? getStepIndex(result.status) : -1;

  return (
    <>
      <Helmet>
        <title>Track Your Order — Northline</title>
        <meta name="description" content="Track your Northline order status using your order ID and email address. No account required." />
        <meta property="og:title" content="Track Your Order — Northline" />
        <meta property="og:description" content="Track your Northline order status without an account." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>

      <div className="mx-auto max-w-2xl space-y-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TruckIcon className="size-6" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Real-time updates</p>
              <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Track Your Order</h1>
            </div>
          </div>
          <p className="text-[15px] leading-relaxed text-ink3">
            Enter your order ID and email address to check the status of your order.
            No account required.
          </p>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <form
            onSubmit={handleTrack}
            className="rounded-2xl border border-stroke bg-card p-6 space-y-4"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="track-order-id" className="mb-1.5 block text-sm font-semibold text-ink">
                  Order ID
                </label>
                <input
                  id="track-order-id"
                  type="text"
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. ORD-123456"
                  className="w-full rounded-xl border border-stroke bg-input px-4 py-3 font-mono text-sm text-ink placeholder:font-sans placeholder:text-ink4 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="mt-1 text-[11px] text-ink4">
                  Found in your order confirmation email.
                </p>
              </div>

              <div>
                <label htmlFor="track-email" className="mb-1.5 block text-sm font-semibold text-ink">
                  Email address
                </label>
                <input
                  id="track-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <p className="mt-1 text-[11px] text-ink4">
                  The email address used when placing your order.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-60"
            >
              {!loading && (
                <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
              )}
              {loading ? (
                <>
                  <div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Searching...
                </>
              ) : (
                <>
                  <SearchIcon className="size-4" />
                  Track order
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Result */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-stroke bg-card p-6 space-y-6"
          >
            {/* Order info */}
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-ink4">Order</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-ink">{result.orderId}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink4">{result.items} item{result.items !== 1 ? "s" : ""}</p>
                <p className="mt-0.5 text-sm font-bold text-ink">${result.total.toFixed(2)}</p>
              </div>
            </div>

            {/* Progress stepper */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-ink">Order progress</p>
              <div className="relative">
                {/* Line */}
                <div className="absolute left-[15px] top-0 h-full w-px bg-stroke" />
                <div
                  className="absolute left-[15px] top-0 w-px bg-emerald-500 transition-all duration-500"
                  style={{ height: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                />
                <div className="space-y-5">
                  {STATUS_STEPS.map((step, i) => {
                    const done = i <= currentStep;
                    const active = i === currentStep;
                    return (
                      <div key={step.key} className="relative flex items-center gap-4 pl-9">
                        <div className={`absolute left-0 flex size-[30px] items-center justify-center rounded-full border-2 transition-all ${
                          done
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-stroke bg-card text-ink4"
                        }`}>
                          {done ? (
                            active && result.status !== "DELIVERED" ? (
                              <div className="size-2 animate-pulse rounded-full bg-white" />
                            ) : (
                              <CheckCircleIcon className="size-4" />
                            )
                          ) : (
                            <div className="size-2 rounded-full bg-stroke" />
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${done ? "text-ink" : "text-ink4"}`}>
                            {step.label}
                          </p>
                          {active && result.estimatedDelivery && step.key !== "DELIVERED" && (
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              Est. delivery: {result.estimatedDelivery}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tracking info */}
            {result.trackingNumber && (
              <div className="flex items-center gap-3 rounded-xl border border-stroke bg-raised p-4">
                <PackageIcon className="size-5 shrink-0 text-ink3" />
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Tracking number</p>
                  <p className="mt-0.5 font-mono text-sm font-bold text-ink">{result.trackingNumber}</p>
                  {result.carrier && <p className="text-xs text-ink4">via {result.carrier}</p>}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Help section */}
        <div className="rounded-xl border border-stroke bg-raised p-5">
          <p className="text-sm font-semibold text-ink">Need help?</p>
          <div className="mt-3 space-y-2">
            {[
              { icon: ClockIcon, text: "Orders typically ship within 1–2 business days." },
              { icon: PackageIcon, text: "Your order confirmation email contains your order ID." },
              { icon: SearchIcon, text: "Can't find your order? Contact our support team." },
            ].map(({ icon: Icon, text }, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-ink3">
                <Icon className="mt-0.5 size-4 shrink-0 text-ink4" />
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
