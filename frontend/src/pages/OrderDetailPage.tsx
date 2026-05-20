import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { OrderDetailSkeleton } from "../components/ProductSkeleton";
import { ApiError, apiFetch } from "../lib/api";
import { productImageUrl } from "../lib/productImage";
import type { Order } from "../lib/types";
import { ArrowLeftIcon, ChevronRightIcon, PackageIcon } from "../components/Icons";

type OrderRes = { status: string; data: { order: Order } };

const statusStyles: Record<string, { label: string; className: string; dot: string }> = {
  PENDING:    { label: "Pending",    className: "bg-amber-500/15 text-amber-400 border-amber-500/20",     dot: "bg-amber-400" },
  PAID:       { label: "Paid",       className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", dot: "bg-emerald-400" },
  PROCESSING: { label: "Processing", className: "bg-sky-500/15 text-sky-400 border-sky-500/20",           dot: "bg-sky-400" },
  SHIPPED:    { label: "Shipped",    className: "bg-violet-500/15 text-violet-400 border-violet-500/20",  dot: "bg-violet-400" },
  DELIVERED:  { label: "Delivered",  className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20", dot: "bg-emerald-300" },
  CANCELLED:  { label: "Cancelled",  className: "bg-zinc-800/80 text-zinc-500 border-zinc-700/40",        dot: "bg-zinc-500" },
};

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
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
        method: "PATCH",
        auth: true,
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

  if (orderQuery.isPending) return <OrderDetailSkeleton />;

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="rounded-2xl border border-zinc-800/70 p-10 text-center">
        <PackageIcon className="mx-auto size-12 text-zinc-700" />
        <p className="mt-4 text-zinc-400">Order not found.</p>
        <Link to="/orders" className="mt-4 inline-block text-emerald-400 hover:underline">
          Back to orders
        </Link>
      </div>
    );
  }

  const order = orderQuery.data;
  const status = statusStyles[order.status] ?? { label: order.status, className: "bg-zinc-800 text-zinc-400 border-zinc-700", dot: "bg-zinc-500" };
  const canCancel = order.status === "PENDING";
  const subtotal = order.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
        <Link to="/orders" className="transition-colors hover:text-zinc-300">Orders</Link>
        <ChevronRightIcon className="size-3.5 text-zinc-700" />
        <span className="font-mono text-zinc-400">#{order.id.slice(0, 8).toUpperCase()}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
          >
            <ArrowLeftIcon className="size-3.5" />
            All orders
          </Link>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">Order detail</h1>
          <p className="mt-1 font-mono text-xs text-zinc-600">{order.id}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>
            <span className={`size-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <p className="text-xs text-zinc-500">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Order items */}
        <div className="space-y-3 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Items</h2>
          <ul className="space-y-3">
            {order.items.map((item) => {
              const thumb = item.product
                ? productImageUrl(item.product as { name: string; image: string | null; images?: string[] | null })
                : null;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-4"
                >
                  {thumb ? (
                    <Link
                      to={`/products/${item.product_id}`}
                      className="size-16 shrink-0 overflow-hidden rounded-xl bg-zinc-800"
                    >
                      <img src={thumb} alt={item.product?.name ?? ""} className="h-full w-full object-cover transition-transform hover:scale-105" loading="lazy" />
                    </Link>
                  ) : (
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
                      <PackageIcon className="size-7 text-zinc-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    {item.product?.name ? (
                      <Link
                        to={`/products/${item.product_id}`}
                        className="line-clamp-1 text-sm font-medium text-white transition-colors hover:text-emerald-400"
                      >
                        {item.product.name}
                      </Link>
                    ) : (
                      <p className="font-mono text-xs text-zinc-500">{item.product_id.slice(0, 16)}…</p>
                    )}
                    <p className="mt-0.5 text-xs text-zinc-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold tabular-nums text-white">
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs tabular-nums text-zinc-600">${item.price.toFixed(2)} each</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Summary */}
        <div className="h-fit space-y-5 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-400">Summary</h2>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="tabular-nums text-white">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Shipping</span>
              <span className="text-emerald-400">Free</span>
            </div>
          </div>

          <div className="flex justify-between border-t border-zinc-800/60 pt-3 text-base font-semibold text-white">
            <span>Total</span>
            <span className="tabular-nums">${order.total.toFixed(2)}</span>
          </div>

          {canCancel && (
            <div className="space-y-3 border-t border-zinc-800/60 pt-4">
              <p className="text-xs text-zinc-500">
                This order hasn't been processed yet and can still be cancelled.
              </p>
              <button
                type="button"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
                className="w-full rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm font-semibold text-red-400 transition-colors hover:bg-red-950/50 disabled:opacity-50"
              >
                {cancelMutation.isPending ? "Cancelling…" : "Cancel order"}
              </button>
            </div>
          )}

          {order.status === "CANCELLED" && (
            <div className="rounded-xl border border-zinc-700/40 bg-zinc-800/40 px-4 py-3 text-xs text-zinc-500">
              This order was cancelled.
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
