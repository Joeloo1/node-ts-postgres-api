import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { OrderDetailSkeleton } from "../components/ProductSkeleton";
import { ApiError, apiFetch } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { productImageUrl } from "../lib/productImage";
import type { Order } from "../lib/types";
import { ArrowLeftIcon, CheckCircleIcon, PackageIcon } from "../components/Icons";

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
  { key: "PENDING",    label: "Order placed" },
  { key: "PAID",       label: "Payment confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED",    label: "Shipped" },
  { key: "DELIVERED",  label: "Delivered" },
];

function OrderTimeline({ status }: { status: string }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div className={`flex items-center gap-3 rounded-2xl border px-5 py-4 ${
        status === "CANCELLED"
          ? "border-edge/40 bg-well/50"
          : "border-blue-500/15 bg-blue-500/5"
      }`}>
        <div className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
          status === "CANCELLED" ? "bg-raised" : "bg-blue-500/10"
        }`}>
          <svg className={`size-4 ${status === "CANCELLED" ? "text-ink4" : "text-blue-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
              : "A refund has been processed for this order."}
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
        {/* Background connector */}
        <div className="absolute left-[14px] right-[14px] top-[14px] h-px bg-stroke" />
        {/* Progress fill */}
        <div
          className="absolute left-[14px] top-[14px] h-px bg-emerald-500 transition-all duration-700"
          style={{ width: currentIdx <= 0 ? "0%" : `calc(${(currentIdx / (TIMELINE_STEPS.length - 1)) * 100}% - 0px)` }}
        />

        {TIMELINE_STEPS.map((step, i) => {
          const done   = i < currentIdx;
          const active = i === currentIdx;

          return (
            <div key={step.key} className="relative flex flex-1 flex-col items-center gap-2.5">
              {/* Step circle */}
              <div className={`relative z-10 flex size-7 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                done
                  ? "border-emerald-500 bg-emerald-500 shadow-sm shadow-emerald-500/30"
                  : active
                  ? "border-emerald-500 bg-page ring-4 ring-emerald-500/15"
                  : "border-stroke bg-page"
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

              {/* Label */}
              <span className={`max-w-[60px] text-center text-[10px] font-medium leading-tight sm:max-w-none sm:text-[11px] ${
                active ? "text-ink font-semibold" : done ? "text-ink3" : "text-ink4"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OrderDetailPage() {
  usePageTitle("Order");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const orderQuery = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const res = await apiFetch<OrderRes>(`/api/v1/order/${id}`, { auth: true });
      return res.data.order;
    },
    enabled: Boolean(id),
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiFetch(`/api/v1/order/${id}`, {
        method: "PATCH", auth: true,
        body: JSON.stringify({}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order", id] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order cancelled");
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Could not cancel order");
    },
  });

  async function handleReorder(order: Order) {
    const ids = order.items.map((i) => i.product_id).filter(Boolean);
    if (!ids.length) { toast.error("No products to reorder."); return; }
    let added = 0;
    for (const pid of ids) {
      try {
        await apiFetch("/api/v1/cart/items", {
          method: "POST", auth: true,
          body: JSON.stringify({ product_id: pid, quantity: 1 }),
        });
        added++;
      } catch {}
    }
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    toast.success(`${added} item${added !== 1 ? "s" : ""} added to cart`, {
      action: { label: "View cart", onClick: () => navigate("/cart") },
    });
  }

  /* ── Loading ── */
  if (orderQuery.isPending) return <OrderDetailSkeleton />;

  /* ── Error ── */
  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-24 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-raised text-ink4">
          <PackageIcon className="size-7" />
        </div>
        <p className="mt-5 font-semibold text-ink">Order not found</p>
        <p className="mt-1 text-sm text-ink4">This order doesn't exist or you don't have access to it.</p>
        <Link
          to="/orders"
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-stroke bg-card px-4 py-2 text-sm font-medium text-ink2 transition-colors hover:bg-raised"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to orders
        </Link>
      </div>
    );
  }

  const order = orderQuery.data;
  const status = statusConfig[order.status] ?? { label: order.status, dot: "bg-ink4", badge: "border-edge bg-well text-ink3" };
  const canCancel = order.status === "PENDING";
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const shipping = subtotal >= 50 ? 0 : 4.99;

  return (
    <motion.div
      className="space-y-7"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* ── Back + header ── */}
      <div>
        <Link
          to="/orders"
          className="inline-flex items-center gap-1.5 text-sm text-ink4 transition-colors hover:text-ink2"
        >
          <ArrowLeftIcon className="size-3.5" />
          All orders
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Order details
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">
              #{order.id.slice(0, 8).toUpperCase()}
            </h1>
            <p className="mt-1 text-sm text-ink4">
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>

          {/* Status + actions */}
          <div className="flex flex-col items-end gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${status.badge}`}>
              <span className={`size-1.5 shrink-0 rounded-full ${status.dot}`} />
              {status.label}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleReorder(order)}
                className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-card px-3.5 py-2 text-[13px] font-medium text-ink2 transition-colors hover:bg-raised hover:text-ink"
              >
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Reorder
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

      {/* ── Timeline ── */}
      <OrderTimeline status={order.status} />

      {/* ── Items + summary ── */}
      <div className="grid gap-5 lg:grid-cols-3">

        {/* Items list */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-2xl border border-stroke bg-card">
            {/* Section header */}
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
                    {/* Thumbnail */}
                    {thumb ? (
                      <Link
                        to={`/products/${item.product_id}`}
                        className="group relative size-[72px] shrink-0 overflow-hidden rounded-xl bg-raised"
                      >
                        <img
                          src={thumb}
                          alt={item.product?.name ?? ""}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.06]"
                          loading="lazy"
                        />
                      </Link>
                    ) : (
                      <div className="flex size-[72px] shrink-0 items-center justify-center rounded-xl bg-raised">
                        <PackageIcon className="size-6 text-ink4" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      {item.product?.name ? (
                        <Link
                          to={`/products/${item.product_id}`}
                          className="line-clamp-2 text-sm font-medium text-ink transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
                        >
                          {item.product.name}
                        </Link>
                      ) : (
                        <p className="font-mono text-xs text-ink3">{item.product_id.slice(0, 16)}…</p>
                      )}
                      {/* Qty badge */}
                      <div className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-stroke bg-raised px-2 py-0.5 text-[11px] font-medium text-ink3">
                        Qty: {item.quantity}
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold tabular-nums text-ink">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="mt-0.5 text-[11px] tabular-nums text-ink4">
                          ${item.price.toFixed(2)} each
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Order summary */}
        <div className="h-fit overflow-hidden rounded-2xl border border-stroke bg-card">
          <div className="border-b border-stroke px-5 py-4">
            <h2 className="text-sm font-semibold text-ink">Order summary</h2>
          </div>

          <div className="px-5 py-4 space-y-2.5">
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
            {subtotal < 50 && (
              <p className="text-[11px] text-ink4">
                Add ${(50 - subtotal).toFixed(2)} more for free shipping
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-stroke bg-raised/40 px-5 py-4">
            <span className="text-sm font-semibold text-ink">Total</span>
            <span className="text-lg font-bold tabular-nums text-ink">${order.total.toFixed(2)}</span>
          </div>

          {/* Cancel / status notices */}
          {canCancel && (
            <div className="border-t border-stroke px-5 py-4 space-y-3">
              <p className="text-xs text-ink4">
                This order hasn't shipped yet and can still be cancelled.
              </p>
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                className="w-full rounded-lg border border-red-500/25 bg-transparent px-4 py-2.5 text-sm font-semibold text-red-500 dark:text-red-400 transition-colors hover:bg-red-500/8 hover:border-red-500/40 disabled:opacity-50"
              >
                {cancelMutation.isPending ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          )}

          {order.status === "DELIVERED" && (
            <div className="border-t border-stroke px-5 py-4">
              <div className="flex items-center gap-2.5 text-sm">
                <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
                <span className="text-ink3">Delivered successfully</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
