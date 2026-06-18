import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { productImageUrl } from "../lib/productImage";
import type { Order } from "../lib/types";
import { ArrowRightIcon, CheckCircleIcon, PackageIcon } from "../components/Icons";
import { Confetti } from "../components/Confetti";

type VerifyRes = { status: string; data: { order: Order } };

function getEstimatedDelivery() {
  const lo = new Date();
  const hi = new Date();
  lo.setDate(lo.getDate() + 3);
  hi.setDate(hi.getDate() + 7);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(lo)} – ${fmt(hi)}`;
}

const NEXT_STEPS = [
  {
    icon: (
      <svg className="size-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
    title: "Confirmation email",
    desc: "A receipt will be sent to your registered email address.",
  },
  {
    icon: (
      <svg className="size-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    ),
    title: "Order being packed",
    desc: "Our team will prepare your items for shipment within 24 hours.",
  },
  {
    icon: (
      <svg className="size-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
      </svg>
    ),
    title: "Shipped to you",
    desc: "You'll receive a tracking number once your order ships.",
  },
];

export function OrderConfirmationPage() {
  usePageTitle("Order Confirmed");
  const { sessionId } = useParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);
  const didFire = useRef(false);

  const { data: order, isPending, isError, error } = useQuery({
    queryKey: ["order-confirmation", sessionId],
    queryFn: async () => {
      const res = await apiFetch<VerifyRes>(`/api/v1/payments/verify-session/${sessionId}`, { auth: true });
      return res.data.order;
    },
    enabled: Boolean(sessionId),
    retry: 3,
    retryDelay: 1500,
  });

  useEffect(() => {
    if (order && !didFire.current) {
      didFire.current = true;
      queryClient.invalidateQueries({ queryKey: queryKeys.cart() });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [order, queryClient]);

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-10">
      <Confetti active={showConfetti} />

      {/* Success header */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-8 py-10 text-center"
      >
        <div className="pointer-events-none absolute inset-0 dot-grid opacity-[0.15]" />
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-emerald-500/15 blur-3xl" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto mb-5 flex size-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500/20 to-teal-500/10 ring-[3px] ring-emerald-500/20 shadow-xl shadow-emerald-500/20"
        >
          <CheckCircleIcon className="size-12 text-emerald-500" />
        </motion.div>
        <h1 className="font-display text-3xl font-bold text-ink">Payment confirmed!</h1>
        <p className="mt-2 text-ink3">
          Thank you for your purchase. Your order has been received and is being prepared.
        </p>
        {order && (
          <p className="mt-3 font-mono text-xs text-ink4">Order #{order.id.slice(0, 8).toUpperCase()}</p>
        )}

        <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-2.5">
          <svg className="size-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Estimated delivery</p>
            <p className="text-sm font-bold text-ink">{getEstimatedDelivery()}</p>
          </div>
        </div>
      </motion.div>

      {/* Loading state */}
      {isPending && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-8 text-center">
          <svg className="size-6 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-sm text-ink4">Confirming your order…</p>
        </motion.div>
      )}

      {/* Error state */}
      {isError && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-5 py-4">
          <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
            {error instanceof ApiError ? error.message : "Could not load order details."}
          </p>
          <p className="mt-1 text-xs text-ink4">
            Your payment was processed — check{" "}
            <Link to="/orders" className="underline hover:text-ink2">your orders</Link>{" "}
            for confirmation.
          </p>
        </div>
      )}

      {/* Order summary */}
      {!isPending && order && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
          <div className="overflow-hidden rounded-2xl border border-stroke bg-card">
            <div className="border-b border-stroke px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">Order summary</h2>
            </div>
            <ul className="divide-y divide-stroke">
              {order.items.map((item) => {
                const thumb = item.product
                  ? productImageUrl(item.product as { name: string; image: string | null; images?: string[] | null })
                  : null;
                return (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-raised">
                      {thumb ? (
                        <img src={thumb} alt={item.product?.name ?? ""} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <PackageIcon className="size-5 text-ink4" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.product?.name ?? "Product"}</p>
                      <p className="mt-0.5 text-xs text-ink4">Qty {item.quantity}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-ink">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-stroke bg-raised/40 px-5 py-4">
              <span className="text-sm font-semibold text-ink">Total paid</span>
              <span className="text-lg font-bold tabular-nums text-ink">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* What happens next */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="border-b border-stroke px-5 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">What happens next</h2>
            <span className="text-[11px] text-ink4">3 steps</span>
          </div>
        </div>
        <ul className="divide-y divide-stroke">
          {NEXT_STEPS.map((step, i) => (
            <li key={i} className="flex items-start gap-4 px-5 py-4">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-stroke bg-raised shadow-sm">
                {step.icon}
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{step.title}</p>
                <p className="mt-0.5 text-xs text-ink4">{step.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </motion.div>

      {/* CTAs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.35 }}
        className="flex flex-wrap gap-3"
      >
        {order && (
          <Link
            to={`/orders/${order.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-card px-5 py-2.5 text-sm font-semibold text-ink2 transition-colors hover:bg-raised"
          >
            View order details
            <ArrowRightIcon className="size-4" />
          </Link>
        )}
        <Link
          to="/products"
          className="relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700 active:scale-[0.98]"
        >
          <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
          Continue shopping
        </Link>
      </motion.div>
    </div>
  );
}
