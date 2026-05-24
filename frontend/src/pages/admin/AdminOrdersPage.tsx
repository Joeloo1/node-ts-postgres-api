import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ApiError, apiFetch } from "../../lib/api";
import { AdminTableSkeleton } from "../../components/ProductSkeleton";
import type { Order, OrderStatus } from "../../lib/types";
import { ChevronRightIcon } from "../../components/Icons";

type AdminOrdersRes = {
  status: string;
  results: number;
  total: number;
  totalPages: number;
  page: number;
  data: { orders: Order[] };
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING:    "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25",
  PAID:       "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25",
  PROCESSING: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/25",
  SHIPPED:    "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/25",
  DELIVERED:  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  CANCELLED:  "bg-well text-ink4 border-edge/40",
  REFUNDED:   "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25",
};

const ALL_STATUSES: OrderStatus[] = [
  "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED",
];

export function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "">("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>("PROCESSING");

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const res = await apiFetch<AdminOrdersRes>(`/api/v1/admin/orders?${params}`, { auth: true });
      return res;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      await apiFetch(`/api/v1/admin/orders/${id}/status`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: async (_, { status }) => {
      toast.success(`Order status updated to ${status}.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  const cancelOrder = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/v1/admin/orders/${id}/cancel`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({}),
      });
    },
    onSuccess: async () => {
      toast.success("Order cancelled.");
      await queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Cancel failed"),
  });

  function onCancel(id: string) {
    if (!window.confirm("Cancel this order? The customer will lose their order.")) return;
    cancelOrder.mutate(id);
  }

  const orders = ordersQuery.data?.data.orders ?? [];
  const totalPages = ordersQuery.data?.totalPages ?? 1;
  const total = ordersQuery.data?.total ?? 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-stroke bg-card">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stroke px-6 py-4">
        <div>
          <h2 className="font-display text-sm font-semibold text-ink">Orders</h2>
          {!ordersQuery.isPending && (
            <p className="text-xs text-ink4">{total} orders total</p>
          )}
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { setStatusFilter(""); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${
              statusFilter === ""
                ? "bg-emerald-600 text-white border-transparent"
                : "border-stroke text-ink3 hover:border-edge hover:text-ink"
            }`}
          >
            All
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors border ${
                statusFilter === s
                  ? "bg-emerald-600 text-white border-transparent"
                  : "border-stroke text-ink3 hover:border-edge hover:text-ink"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {ordersQuery.isPending ? (
          <AdminTableSkeleton rows={8} />
        ) : ordersQuery.isError ? (
          <p className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {ordersQuery.error instanceof Error ? ordersQuery.error.message : "Failed to load orders"}
          </p>
        ) : orders.length === 0 ? (
          <div className="rounded-xl border border-stroke bg-raised p-10 text-center">
            <p className="text-sm text-ink4">No orders found for the selected filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => {
              const isExpanded = expandedId === order.id;
              return (
                <div
                  key={order.id}
                  className="overflow-hidden rounded-xl border border-stroke bg-raised transition-colors hover:border-edge"
                >
                  {/* Order row */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-3.5 text-left transition-colors hover:bg-hover"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="truncate font-mono text-xs text-ink4">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-ink4">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[order.status]}`}>
                        {order.status}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-ink">${order.total.toFixed(2)}</span>
                      <ChevronRightIcon
                        className={`size-4 text-ink4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                      />
                    </div>
                  </button>

                  {/* Expanded panel */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-stroke px-4 py-4 space-y-4">
                          {/* Items */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-widest text-ink4">Items</p>
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-3 text-sm">
                                {item.product?.image && (
                                  <img
                                    src={item.product.image.startsWith("http")
                                      ? item.product.image
                                      : `${import.meta.env.VITE_API_URL?.replace(/\/$/, "") || ""}/public/products/${item.product.image}`}
                                    alt={item.product.name}
                                    className="h-10 w-10 rounded-lg border border-stroke object-cover"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="truncate font-medium text-ink">{item.product?.name ?? item.product_id}</p>
                                  <p className="text-xs text-ink4">
                                    {item.quantity} × ${item.price.toFixed(2)}
                                  </p>
                                </div>
                                <p className="shrink-0 tabular-nums text-ink font-semibold">
                                  ${(item.quantity * item.price).toFixed(2)}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Update actions */}
                          <div className="flex flex-wrap items-center gap-3 border-t border-stroke pt-4">
                            <select
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                              className="rounded-xl border border-stroke bg-input px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-colors"
                            >
                              {ALL_STATUSES.map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={updateStatus.isPending || newStatus === order.status}
                              onClick={() => updateStatus.mutate({ id: order.id, status: newStatus })}
                              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                            >
                              {updateStatus.isPending ? "Updating…" : "Update status"}
                            </button>
                            {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                              <button
                                type="button"
                                disabled={cancelOrder.isPending}
                                onClick={() => onCancel(order.id)}
                                className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                              >
                                Cancel order
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-xl border border-stroke bg-card px-4 py-2 text-sm font-medium text-ink2 hover:bg-hover disabled:opacity-40 transition-colors"
            >
              ← Previous
            </button>
            <span className="text-sm text-ink4">Page {page} of {totalPages}</span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-xl border border-stroke bg-card px-4 py-2 text-sm font-medium text-ink2 hover:bg-hover disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
