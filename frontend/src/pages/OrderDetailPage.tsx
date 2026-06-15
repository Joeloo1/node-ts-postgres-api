import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useState } from "react";

function CopyOrderId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      title="Copy order ID"
      className="ml-2 inline-flex items-center gap-1 rounded-md border border-stroke bg-raised px-2 py-0.5 text-[11px] font-medium text-ink4 transition-colors hover:bg-well hover:text-ink2"
    >
      {copied ? (
        <>
          <svg className="size-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}
import { OrderDetailSkeleton } from "../components/ProductSkeleton";
import { ApiError, apiFetch } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { queryKeys } from "../lib/queryKeys";
import { productImageUrl } from "../lib/productImage";
import type { Order } from "../lib/types";
import { ArrowLeftIcon, CheckCircleIcon, PackageIcon, StarIcon, TruckIcon } from "../components/Icons";
import { ConfirmButton } from "../components/ConfirmButton";

type OrderRes = { status: string; data: { order: Order } };

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  PENDING:    { label: "Pending",    dot: "bg-amber-400",   badge: "border-amber-500/20 bg-amber-500/8 text-amber-600 dark:text-amber-400" },
  PAID:       { label: "Paid",       dot: "bg-emerald-400", badge: "border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400" },
  PROCESSING: { label: "Processing", dot: "bg-sky-400",     badge: "border-sky-500/20 bg-sky-500/8 text-sky-600 dark:text-sky-400" },
  SHIPPED:    { label: "Shipped",    dot: "bg-violet-400",  badge: "border-violet-500/20 bg-violet-500/8 text-violet-600 dark:text-violet-400" },
  DELIVERED:  { label: "Delivered",  dot: "bg-emerald-400", badge: "border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-300" },
  CANCELLED:  { label: "Cancelled",  dot: "bg-ink4",        badge: "border-edge/40 bg-well text-ink4" },
  REFUNDED:   { label: "Refunded",   dot: "bg-blue-400",    badge: "border-blue-500/20 bg-blue-500/8 text-blue-600 dark:text-blue-400" },
};

const TIMELINE_STEPS = [
  { key: "PENDING",    label: "Order placed",       desc: "We received your order" },
  { key: "PAID",       label: "Payment confirmed",  desc: "Payment was verified" },
  { key: "PROCESSING", label: "Processing",          desc: "Being prepared for shipment" },
  { key: "SHIPPED",    label: "Shipped",             desc: "On its way to you" },
  { key: "DELIVERED",  label: "Delivered",           desc: "Order has been delivered" },
];

const ACTIVE_STATUSES = new Set(["PENDING", "PAID", "PROCESSING", "SHIPPED"]);

function getEstimatedDelivery(createdAt: string, status: string): string {
  const base = new Date(createdAt);
  const offset = status === "SHIPPED" ? 2 : 5;
  const lo = new Date(base);
  const hi = new Date(base);
  lo.setDate(lo.getDate() + offset);
  hi.setDate(hi.getDate() + offset + 3);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(lo)} – ${fmt(hi)}`;
}

function isWithin30Days(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 30 * 24 * 60 * 60 * 1000;
}

function OrderTimeline({ status, createdAt }: { status: string; createdAt: string }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${
        status === "CANCELLED" ? "border-edge/40 bg-well/50" : "border-blue-500/15 bg-blue-500/5"
      }`}>
        <div className={`flex size-12 shrink-0 items-center justify-center rounded-full ${status === "CANCELLED" ? "bg-raised" : "bg-blue-500/10"}`}>
          <svg className={`size-6 ${status === "CANCELLED" ? "text-ink4" : "text-blue-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={
              status === "CANCELLED"
                ? "M6 18L18 6M6 6l12 12"
                : "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
            } />
          </svg>
        </div>
        <div>
          <p className={`text-sm font-semibold ${status === "CANCELLED" ? "text-ink3" : "text-blue-600 dark:text-blue-400"}`}>
            {status === "CANCELLED" ? "Order cancelled" : "Refund issued"}
          </p>
          <p className="mt-0.5 text-xs text-ink4">
            {status === "CANCELLED"
              ? "This order was cancelled and will not be fulfilled."
              : "A refund has been processed to your original payment method."}
          </p>
        </div>
      </div>
    );
  }

  const currentIdx = TIMELINE_STEPS.findIndex((s) => s.key === status);

  return (
    <div className="overflow-hidden rounded-2xl border border-stroke bg-card px-5 py-6">
      <p className="mb-5 text-[10px] font-semibold uppercase tracking-widest text-ink4">Order progress</p>
      <div className="relative flex items-start justify-between">
        <div className="absolute left-[14px] right-[14px] top-[14px] h-px bg-stroke" />
        <div
          className="absolute left-[14px] top-[14px] h-px bg-emerald-500 transition-all duration-700"
          style={{ width: currentIdx <= 0 ? "0%" : `${(currentIdx / (TIMELINE_STEPS.length - 1)) * 100}%` }}
        />
        {TIMELINE_STEPS.map((step, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;
          const placedDate = i === 0 && (done || active)
            ? new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : null;
          return (
            <div key={step.key} className="group relative flex flex-1 flex-col items-center gap-2.5">
              <div className={`relative z-10 flex size-7 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                done ? "border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-500/30" :
                active ? "border-emerald-500 bg-page ring-4 ring-emerald-500/15" : "border-stroke bg-page"
              }`}>
                {done ? (
                  <svg className="size-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : active ? (
                  <span className="size-2 rounded-full bg-emerald-500" />
                ) : (
                  <span className="size-1.5 rounded-full bg-edge" />
                )}
              </div>
              <span className={`max-w-[58px] text-center text-[10px] font-medium leading-tight sm:max-w-none sm:text-[11px] ${
                active ? "font-semibold text-ink" : done ? "text-ink3" : "text-ink4"
              }`}>
                {step.label}
              </span>
              {placedDate && (
                <span className="hidden text-[10px] tabular-nums text-ink4 sm:block">{placedDate}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Current step description */}
      {currentIdx >= 0 && (
        <p className="mt-5 text-center text-xs text-ink4">
          {TIMELINE_STEPS[currentIdx].desc}
        </p>
      )}
    </div>
  );
}

export function OrderDetailPage() {
  usePageTitle("Order");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reordering, setReordering] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnReason, setReturnReason] = useState("");

  const orderQuery = useQuery({
    queryKey: queryKeys.order(id!),
    queryFn: async () => {
      const res = await apiFetch<OrderRes>(`/api/v1/order/${id}`, { auth: true });
      return res.data.order;
    },
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(`/api/v1/order/${id}`, { method: "PATCH", auth: true, body: JSON.stringify({}) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.order(id!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders() });
      toast.success("Order cancelled");
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Could not cancel order");
    },
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(`/api/v1/order/${id}/return`, {
        method: "POST",
        auth: true,
        body: JSON.stringify({ reason: returnReason.trim() }),
      });
    },
    onSuccess: () => {
      setReturnDialogOpen(false);
      setReturnReason("");
      toast.success("Return request submitted. We'll be in touch within 1–2 business days.");
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Could not submit return request");
    },
  });

  async function handleReorder(order: Order) {
    const reorderItems = order.items.filter((i) => i.product_id);
    if (!reorderItems.length) { toast.error("No products to reorder."); return; }
    setReordering(true);
    try {
      const results = await Promise.allSettled(
        reorderItems.map((i) =>
          apiFetch("/api/v1/cart/items", {
            method: "POST", auth: true,
            body: JSON.stringify({ product_id: i.product_id, quantity: i.quantity }),
          }),
        ),
      );
      const added = results.filter((r) => r.status === "fulfilled").length;
      const failedItems = results
        .map((r, idx) => (r.status === "rejected" ? reorderItems[idx] : null))
        .filter((x): x is NonNullable<typeof x> => x !== null);

      queryClient.invalidateQueries({ queryKey: queryKeys.cart() });

      if (added > 0) {
        toast.success(`${added} item${added !== 1 ? "s" : ""} added to cart`, {
          action: { label: "View cart", onClick: () => navigate("/cart") },
        });
      }
      if (failedItems.length > 0) {
        const names = failedItems
          .slice(0, 2)
          .map((i) => i.product?.name ?? "item")
          .join(", ");
        const extra = failedItems.length > 2 ? ` +${failedItems.length - 2} more` : "";
        toast.warning(`Could not add: ${names}${extra} — item may be out of stock`);
      }
    } finally {
      setReordering(false);
    }
  }

  if (orderQuery.isPending) return <OrderDetailSkeleton />;

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-24 text-center">
        <div className="flex size-24 items-center justify-center rounded-2xl bg-raised text-ink4">
          <PackageIcon className="size-12" />
        </div>
        <p className="mt-5 font-semibold text-ink">Order not found</p>
        <p className="mt-1 text-sm text-ink4">This order doesn't exist or you don't have access to it.</p>
        <Link to="/orders" className="mt-6 inline-flex items-center gap-2 rounded-lg border border-stroke bg-card px-4 py-2 text-sm font-medium text-ink2 transition-colors hover:bg-raised">
          <ArrowLeftIcon className="size-3.5" />
          Back to orders
        </Link>
      </div>
    );
  }

  const order = orderQuery.data;
  const status = statusConfig[order.status] ?? { label: order.status, dot: "bg-ink4", badge: "border-edge bg-well text-ink3" };
  const canCancel = order.status === "PENDING";
  const isActive = ACTIVE_STATUSES.has(order.status);
  const isDelivered = order.status === "DELIVERED";
  const canReturn = isDelivered && isWithin30Days(order.createdAt);
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 50 ? 0 : 4.99;

  return (
    <motion.div
      className="space-y-7"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Back + header */}
      <div>
        <Link to="/orders" className="inline-flex items-center gap-1.5 text-sm text-ink4 transition-colors hover:text-ink2 print:hidden">
          <ArrowLeftIcon className="size-3.5" />
          All orders
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Order details</p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                #{order.id.slice(0, 8).toUpperCase()}
              </h1>
              <CopyOrderId id={order.id} />
            </div>
            <p className="mt-1 text-sm text-ink4">
              {new Date(order.createdAt).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>

          <div className="flex flex-col items-end gap-3 print:hidden">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${status.badge}`}>
              <span className={`size-1.5 shrink-0 rounded-full ${status.dot}`} />
              {status.label}
            </span>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleReorder(order)}
                disabled={reordering}
                className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink2 transition-colors hover:bg-raised hover:text-ink disabled:opacity-50"
              >
                {reordering ? (
                  <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                )}
                {reordering ? "Adding…" : "Reorder"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink2 transition-colors hover:bg-raised hover:text-ink"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                Print
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress timeline */}
      <OrderTimeline status={order.status} createdAt={order.createdAt} />

      {/* Estimated delivery banner for active orders */}
      {isActive && (
        <div className="flex items-center gap-3 rounded-2xl border border-violet-500/15 bg-violet-500/5 px-5 py-4">
          <TruckIcon className="size-5 shrink-0 text-violet-500" />
          <div>
            <p className="text-sm font-semibold text-ink">Estimated delivery</p>
            <p className="mt-0.5 text-sm text-ink3">{getEstimatedDelivery(order.createdAt, order.status)}</p>
          </div>
          {order.status === "SHIPPED" && (
            <span className="ml-auto shrink-0 rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-500">
              In transit
            </span>
          )}
        </div>
      )}

      {/* Tracking section for shipped orders */}
      {order.status === "SHIPPED" && (
        <div className="overflow-hidden rounded-2xl border border-stroke bg-card">
          <div className="flex items-center justify-between border-b border-stroke px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Shipment tracking</h2>
            {order.trackingCarrier && (
              <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                {order.trackingCarrier}
              </span>
            )}
          </div>
          {order.trackingNumber ? (
            <div className="space-y-3 px-5 py-5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink4">Tracking number</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-lg border border-stroke bg-raised px-3 py-2 font-mono text-sm font-semibold text-ink">
                  {order.trackingNumber}
                </code>
                <CopyOrderId id={order.trackingNumber} />
              </div>
              <p className="text-xs text-ink4">
                Use this number on the carrier's website to get live updates.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-5 py-6 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-violet-500/10">
                <TruckIcon className="size-7 text-violet-500" />
              </div>
              <p className="text-sm font-medium text-ink">Your package is on its way</p>
              <p className="text-xs text-ink4">
                Tracking information will be emailed to you once available from the carrier.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Delivered — review + return actions */}
      {isDelivered && (
        <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-3 border-b border-emerald-500/15 px-5 py-4">
            <CheckCircleIcon className="size-5 text-emerald-500" />
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              Order delivered successfully
            </p>
          </div>
          <div className="space-y-3 px-5 py-4">
            {/* Review links for every item in the order */}
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink4">
                Rate your items
              </p>
              <div className="flex flex-wrap gap-2">
                {order.items
                  .filter((i) => i.product_id && i.product?.name)
                  .map((item) => (
                    <Link
                      key={item.id}
                      to={`/products/${item.product_id}#reviews`}
                      className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-card px-3 py-1.5 text-[13px] font-medium text-ink2 transition-colors hover:bg-raised hover:text-ink"
                    >
                      <StarIcon className="size-3.5 shrink-0 text-amber-400" filled />
                      <span className="max-w-[160px] truncate">{item.product!.name}</span>
                    </Link>
                  ))}
              </div>
            </div>

            {canReturn && (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setReturnDialogOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink2 transition-colors hover:bg-raised hover:text-ink"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                  </svg>
                  Request return
                </button>

                {returnDialogOpen && (
                  <div className="rounded-xl border border-stroke bg-raised p-4 space-y-3">
                    <p className="text-[13px] font-semibold text-ink">Return request</p>
                    <p className="text-xs text-ink4">
                      Describe the reason for your return. We'll review and respond within 1–2 business days.
                    </p>
                    <textarea
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="e.g. Item arrived damaged, wrong size, changed my mind…"
                      rows={3}
                      className="w-full resize-none rounded-lg border border-stroke bg-card px-3 py-2 text-[13px] text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => returnMutation.mutate()}
                        disabled={!returnReason.trim() || returnMutation.isPending}
                        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {returnMutation.isPending ? "Submitting…" : "Submit return"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setReturnDialogOpen(false); setReturnReason(""); }}
                        className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink2 transition-colors hover:bg-raised"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Items + summary */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Items */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-stroke bg-card">
            <div className="border-b border-stroke px-5 py-4">
              <h2 className="text-sm font-semibold text-ink">
                Items ordered
                <span className="ml-2 text-[12px] font-normal text-ink4">
                  {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                </span>
              </h2>
            </div>

            <ul className="divide-y divide-stroke">
              {order.items.map((item) => {
                const thumb = item.product
                  ? productImageUrl(item.product as { name: string; image: string | null; images?: string[] | null })
                  : null;
                return (
                  <li key={item.id} className="flex items-center gap-4 px-5 py-4">
                    {thumb ? (
                      <Link to={`/products/${item.product_id}`} className="group relative size-[72px] shrink-0 overflow-hidden rounded-xl bg-raised print:no-underline">
                        <img src={thumb} alt={item.product?.name ?? ""} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]" loading="lazy" />
                      </Link>
                    ) : (
                      <div className="flex size-[72px] shrink-0 items-center justify-center rounded-xl bg-raised">
                        <PackageIcon className="size-6 text-ink4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {item.product?.name ? (
                        <Link to={`/products/${item.product_id}`} className="line-clamp-2 text-sm font-medium text-ink transition-colors hover:text-emerald-600 dark:hover:text-emerald-400">
                          {item.product.name}
                        </Link>
                      ) : (
                        <p className="font-mono text-xs text-ink3">{item.product_id.slice(0, 16)}…</p>
                      )}
                      <div className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-stroke bg-raised px-2 py-0.5 text-[11px] font-medium text-ink3">
                        Qty: {item.quantity}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums text-ink">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="mt-0.5 text-[11px] tabular-nums text-ink4">${item.price.toFixed(2)} each</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Summary */}
        <div className="h-fit overflow-hidden rounded-2xl border border-stroke bg-card">
          <div className="border-b border-stroke px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Order summary</h2>
          </div>

          <div className="space-y-2.5 px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink3">Subtotal</span>
              <span className="tabular-nums font-medium text-ink">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink3">Shipping</span>
              {shipping === 0 ? (
                <span className="font-medium text-emerald-600 dark:text-emerald-400">Free</span>
              ) : (
                <span className="tabular-nums font-medium text-ink">${shipping.toFixed(2)}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-stroke bg-raised/40 px-5 py-4">
            <span className="text-sm font-semibold text-ink">Total</span>
            <span className="text-lg font-bold tabular-nums text-ink">${order.total.toFixed(2)}</span>
          </div>

          {/* Shipping address */}
          {order.shippingAddress && (
            <div className="space-y-1 border-t border-stroke px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">Shipped to</p>
              <p className="text-sm text-ink">{order.shippingAddress.street}</p>
              <p className="text-sm text-ink3">
                {order.shippingAddress.city}
                {order.shippingAddress.state ? `, ${order.shippingAddress.state}` : ""}
                {order.shippingAddress.zipCode ? ` ${order.shippingAddress.zipCode}` : ""}
              </p>
              {order.shippingAddress.country && (
                <p className="text-sm text-ink3">{order.shippingAddress.country}</p>
              )}
            </div>
          )}

          {/* Payment method */}
          {order.paymentMethod && (
            <div className="flex items-center gap-2 border-t border-stroke px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4 shrink-0">Payment</p>
              <p className="text-sm text-ink3 capitalize">
                {order.paymentMethod.type === "card"
                  ? `${order.paymentMethod.brand} ···· ${order.paymentMethod.last4}`
                  : `PayPal · ${order.paymentMethod.email}`}
              </p>
            </div>
          )}

          {canCancel && (
            <div className="space-y-3 border-t border-stroke px-5 py-4 print:hidden">
              <p className="text-xs text-ink4">This order hasn't shipped yet and can still be cancelled.</p>
              <ConfirmButton
                onConfirm={() => cancelMutation.mutate()}
                message="Permanently cancel this order?"
                confirmLabel="Yes, cancel order"
                className="w-full rounded-lg border border-red-500/25 bg-transparent px-4 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:border-red-500/40 hover:bg-red-500/8 dark:text-red-400 disabled:opacity-50"
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? "Cancelling…" : "Cancel order"}
              </ConfirmButton>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
