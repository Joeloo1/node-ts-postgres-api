import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../lib/api";
import { AdminTableSkeleton } from "../../components/ProductSkeleton";
import type { Order, OrderStatus } from "../../lib/types";

type AdminOrdersRes = {
  status: string;
  results: number;
  total: number;
  totalPages: number;
  page: number;
  data: { orders: Order[] };
};

const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: "bg-amber-900/40 text-amber-400",
  PAID: "bg-blue-900/40 text-blue-400",
  PROCESSING: "bg-purple-900/40 text-purple-400",
  SHIPPED: "bg-cyan-900/40 text-cyan-400",
  DELIVERED: "bg-emerald-900/40 text-emerald-400",
  CANCELLED: "bg-zinc-800 text-zinc-500",
};

const ALL_STATUSES: OrderStatus[] = [
  "PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED",
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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Orders</h2>
          {!ordersQuery.isPending && (
            <p className="mt-0.5 text-sm text-zinc-500">{total} orders total</p>
          )}
        </div>

        {/* Status filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => { setStatusFilter(""); setPage(1); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              statusFilter === ""
                ? "bg-emerald-600 text-white"
                : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All
          </button>
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {ordersQuery.isPending ? (
        <AdminTableSkeleton rows={8} />
      ) : ordersQuery.isError ? (
        <p className="mt-4 text-sm text-red-400">
          {ordersQuery.error instanceof Error ? ordersQuery.error.message : "Failed to load orders"}
        </p>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-950/30 p-8 text-center text-sm text-zinc-500">
          No orders found.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id;
            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40 transition-colors"
              >
                {/* Order row */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-3 text-left hover:bg-zinc-900/50 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="truncate font-mono text-xs text-zinc-500">{order.id}</p>
                    <p className="text-xs text-zinc-600">
                      {new Date(order.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {order.status}
                    </span>
                    <span className="text-sm font-semibold text-white">
                      ${order.total.toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </button>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-zinc-800 px-4 py-4 space-y-4">
                    {/* Items */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Items</p>
                      {order.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 text-sm">
                          {item.product?.image && (
                            <img
                              src={item.product.image.startsWith("http") ? item.product.image : `${import.meta.env.VITE_API_URL?.replace(/\/$/, "") || ""}/public/products/${item.product.image}`}
                              alt={item.product.name}
                              className="h-10 w-10 rounded-lg object-cover border border-zinc-800"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="truncate text-zinc-200">{item.product?.name ?? item.product_id}</p>
                            <p className="text-zinc-500">
                              {item.quantity} × ${item.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 border-t border-zinc-800 pt-4">
                      <select
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                        className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={updateStatus.isPending || newStatus === order.status}
                        onClick={() => updateStatus.mutate({ id: order.id, status: newStatus })}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                      >
                        {updateStatus.isPending ? "Updating…" : "Update status"}
                      </button>
                      {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                        <button
                          type="button"
                          disabled={cancelOrder.isPending}
                          onClick={() => onCancel(order.id)}
                          className="rounded-lg border border-red-800/60 bg-red-950/30 px-3 py-1.5 text-sm font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-50 transition-colors"
                        >
                          Cancel order
                        </button>
                      )}
                    </div>
                  </div>
                )}
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
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-zinc-500">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
