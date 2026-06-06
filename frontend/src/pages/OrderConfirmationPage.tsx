import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
  hi.setDate(hi.getDate() + 5);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(lo)} – ${fmt(hi)}`;
}

export function OrderConfirmationPage() {
  usePageTitle("Order Confirmed");
  const { sessionId } = useParams<{ sessionId: string }>();
  const queryClient = useQueryClient();
  const [showConfetti, setShowConfetti] = useState(false);

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
    if (order) {
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
        className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-8 py-10 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
          className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-emerald-500/15"
        >
          <CheckCircleIcon className="size-10 text-emerald-500" />
        </motion.div>
        <h1 className="font-display text-3xl font-bold text-ink">Payment confirmed!</h1>
        <p className="mt-2 text-ink3">
          Thank you for your purchase. Your order has been received and is being prepared.
        </p>
        {order && (
          <p className="mt-3 font-mono text-xs text-ink4">Order #{order.id.slice(0, 8).toUpperCase()}</p>
        )}

        {/* Estimated delivery — Fix #11 */}
        <div className="mt-5 inline-flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-2.5">
          <svg className="size-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
          </svg>
          <div className="text-left">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Estimated delivery</p>
            <p className="text-sm font-bold text-ink">{getEstimatedDelivery()}</p>
          </div>
        </div>
      </motion.div>

      {isPending && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-8 text-center">
          <svg className="size-6 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-sm text-ink4">Confirming your order…</p>
        </motion.div>
      )}

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
                        <div className="flex h-full items-center justify-center"><PackageIcon className="size-5 text-ink4" /></div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{item.product?.name ?? "Product"}</p>
                      <p className="mt-0.5 text-xs text-ink4">Qty {item.quantity}</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-ink">${(item.price * item.quantity).toFixed(2)}</p>
                  </li>
                );
              })}
            </ul>
            <div className="flex items-center justify-between border-t border-stroke bg-raised/40 px-5 py-4">
              <span className="text-sm font-semibold text-ink">Total paid</span>
              <span className="text-lg font-bold tabular-nums text-ink">${order.total.toFixed(2)}</span>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-ink4">A confirmation email will be sent to your registered address.</p>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.35 }}
        className="flex flex-wrap gap-3"
      >
        {order && (
          <Link to={`/orders/${order.id}`} className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-card px-5 py-2.5 text-sm font-semibold text-ink2 transition-colors hover:bg-raised">
            View order details
            <ArrowRightIcon className="size-4" />
          </Link>
        )}
        <Link to="/products" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700">
          Continue shopping
        </Link>
      </motion.div>
    </div>
  );
}
