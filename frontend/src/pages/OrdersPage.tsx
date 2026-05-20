import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Spinner } from "../components/Spinner";
import { apiFetch } from "../lib/api";
import type { Order } from "../lib/types";
import { ChevronRightIcon, PackageIcon } from "../components/Icons";

type OrdersRes = {
  status: string;
  results: number;
  data: { orders: Order[] };
};

const statusStyles: Record<string, { label: string; className: string }> = {
  PENDING:    { label: "Pending",    className: "bg-amber-500/15 text-amber-400 border-amber-500/20" },
  PAID:       { label: "Paid",       className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  PROCESSING: { label: "Processing", className: "bg-sky-500/15 text-sky-400 border-sky-500/20" },
  SHIPPED:    { label: "Shipped",    className: "bg-violet-500/15 text-violet-400 border-violet-500/20" },
  DELIVERED:  { label: "Delivered",  className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" },
  CANCELLED:  { label: "Cancelled",  className: "bg-zinc-800/80 text-zinc-500 border-zinc-700/40" },
};

export function OrdersPage() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await apiFetch<OrdersRes>("/api/v1/order", { auth: true });
      return res.data.orders;
    },
  });

  if (isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spinner />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center">
        <p className="text-sm text-red-300">{(error as Error).message}</p>
      </div>
    );
  }

  const orders = data ?? [];

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-zinc-800/70 bg-zinc-900/30 py-20 text-center">
        <PackageIcon className="size-14 text-zinc-700" />
        <h1 className="mt-5 font-display text-2xl font-bold text-white">No orders yet</h1>
        <p className="mt-2 text-zinc-500">When you check out, your orders appear here.</p>
        <Link
          to="/products"
          className="mt-8 inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Orders</h1>
        <p className="mt-1 text-sm text-zinc-500">
          {orders.length} order{orders.length !== 1 ? "s" : ""} total
        </p>
      </div>

      <ul className="space-y-3">
        {orders.map((o) => {
          const status = statusStyles[o.status] ?? { label: o.status, className: "bg-zinc-800 text-zinc-400" };
          return (
            <li key={o.id}>
              <Link
                to={`/orders/${o.id}`}
                className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800/70 bg-zinc-900/30 px-5 py-4 transition-all hover:border-zinc-700 hover:bg-zinc-900/60"
              >
                <div className="min-w-0">
                  <p className="font-mono text-xs text-zinc-500">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {new Date(o.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}
                  >
                    {status.label}
                  </span>
                  <p className="text-lg font-bold tabular-nums text-white">
                    ${o.total.toFixed(2)}
                  </p>
                  <ChevronRightIcon className="size-4 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-400" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
