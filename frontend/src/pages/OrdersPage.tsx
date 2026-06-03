import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { OrdersSkeleton } from "../components/ProductSkeleton";
import { apiFetch } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { productImageUrl } from "../lib/productImage";
import type { Order, OrderStatus } from "../lib/types";
import { ChevronRightIcon, PackageIcon } from "../components/Icons";

type OrdersRes = {
  status: string;
  results: number;
  data: { orders: Order[] };
};

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  PENDING:    { label: "Pending",    dot: "bg-amber-400",   badge: "border-amber-500/20 bg-amber-500/8 text-amber-600 dark:text-amber-400" },
  PAID:       { label: "Paid",       dot: "bg-emerald-400", badge: "border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400" },
  PROCESSING: { label: "Processing", dot: "bg-sky-400",     badge: "border-sky-500/20 bg-sky-500/8 text-sky-600 dark:text-sky-400" },
  SHIPPED:    { label: "Shipped",    dot: "bg-violet-400",  badge: "border-violet-500/20 bg-violet-500/8 text-violet-600 dark:text-violet-400" },
  DELIVERED:  { label: "Delivered",  dot: "bg-emerald-400", badge: "border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-300" },
  CANCELLED:  { label: "Cancelled",  dot: "bg-ink4",        badge: "border-edge/40 bg-well text-ink4" },
  REFUNDED:   { label: "Refunded",   dot: "bg-blue-400",    badge: "border-blue-500/20 bg-blue-500/8 text-blue-600 dark:text-blue-400" },
};

const FILTER_TABS: Array<{ value: OrderStatus | "ALL"; label: string }> = [
  { value: "ALL",        label: "All orders" },
  { value: "PENDING",    label: "Pending" },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED",    label: "Shipped" },
  { value: "DELIVERED",  label: "Delivered" },
  { value: "CANCELLED",  label: "Cancelled" },
];

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rowFade: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export function OrdersPage() {
  usePageTitle("Orders");
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await apiFetch<OrdersRes>("/api/v1/order", { auth: true });
      return res.data.orders;
    },
  });

  if (isPending) return <OrdersSkeleton />;

  if (isError) {
    return (
      <div className="rounded-2xl border border-red-500/15 bg-card p-8 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-500/8">
          <PackageIcon className="size-5 text-red-400" />
        </div>
        <p className="mt-4 text-sm font-medium text-ink">Failed to load orders</p>
        <p className="mt-1 text-sm text-red-400">{(error as Error).message}</p>
      </div>
    );
  }

  const orders = Array.isArray(data) ? data : [];
  const filtered = filter === "ALL" ? orders : orders.filter((o) => o.status === filter);

  /* ── Empty state ── */
  if (orders.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">History</p>
          <h1 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Your orders</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-24 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-raised text-ink4">
            <PackageIcon className="size-7" />
          </div>
          <h2 className="mt-5 text-base font-semibold text-ink">No orders yet</h2>
          <p className="mt-1.5 text-sm text-ink4">When you check out, your orders will appear here.</p>
          <Link
            to="/products"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            Start shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">History</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Your orders</h1>
      </div>

      {/* ── Filter tabs ── */}
      <div className="-mx-4 sm:mx-0">
        <div className="flex overflow-x-auto border-b border-stroke scrollbar-none">
          {FILTER_TABS.map(({ value, label }) => {
            const count = value === "ALL"
              ? orders.length
              : orders.filter((o) => o.status === value).length;
            if (count === 0 && value !== "ALL") return null;
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`relative shrink-0 px-4 py-3 text-[13px] font-medium transition-colors ${
                  active ? "text-ink" : "text-ink4 hover:text-ink3"
                }`}
              >
                <span className="flex items-center gap-2">
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-semibold ${
                    active
                      ? "bg-raised text-ink3"
                      : "text-ink4/60"
                  }`}>
                    {count}
                  </span>
                </span>
                {/* Bottom border indicator */}
                {active && (
                  <motion.div
                    layoutId="order-tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-[2px] rounded-t-full bg-ink"
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── No results for filter ── */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty-filter"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-16 text-center"
          >
            <p className="text-sm text-ink4">No {filter.toLowerCase()} orders.</p>
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className="mt-3 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
            >
              Show all orders
            </button>
          </motion.div>
        ) : (
          <motion.ul
            key={filter}
            className="space-y-3"
            variants={stagger}
            initial="hidden"
            animate="show"
          >
            {filtered.map((o) => {
              const status = statusConfig[o.status] ?? { label: o.status, dot: "bg-ink4", badge: "border-edge bg-well text-ink3" };
              const thumbs = (o.items ?? [])
                .slice(0, 4)
                .map((item) => item.product
                  ? productImageUrl(item.product as { name: string; image: string | null; images?: string[] | null })
                  : null)
                .filter(Boolean) as string[];
              const extraCount = (o.items?.length ?? 0) - thumbs.length;
              const itemCount = o.items?.length ?? 0;

              return (
                <motion.li key={o.id} variants={rowFade}>
                  <Link
                    to={`/orders/${o.id}`}
                    className="group block overflow-hidden rounded-2xl border border-stroke bg-card transition-all duration-200 hover:border-edge hover:shadow-lg hover:shadow-black/8"
                  >
                    {/* Card top strip: status + date */}
                    <div className="flex items-center justify-between border-b border-stroke bg-raised/30 px-5 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${status.badge}`}>
                        <span className={`size-1.5 shrink-0 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      <p className="text-[12px] text-ink4">
                        {new Date(o.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </p>
                    </div>

                    {/* Card body */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      {/* Product thumbnails */}
                      {thumbs.length > 0 && (
                        <div className="flex shrink-0 -space-x-2.5">
                          {thumbs.map((src, i) => (
                            <div
                              key={i}
                              className="size-12 overflow-hidden rounded-xl border-2 border-card bg-raised shadow-sm"
                              style={{ zIndex: thumbs.length - i }}
                            >
                              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                            </div>
                          ))}
                          {extraCount > 0 && (
                            <div
                              className="flex size-12 items-center justify-center rounded-xl border-2 border-card bg-raised text-[11px] font-semibold text-ink3 shadow-sm"
                            >
                              +{extraCount}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Order info */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">
                          Order{" "}
                          <span className="font-mono text-[13px] text-ink2">
                            #{o.id.slice(0, 8).toUpperCase()}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-ink4">
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </p>
                      </div>

                      {/* Total + arrow */}
                      <div className="flex shrink-0 items-center gap-3">
                        <p className="text-base font-bold tabular-nums text-ink">
                          ${o.total.toFixed(2)}
                        </p>
                        <div className="flex size-8 items-center justify-center rounded-full bg-raised text-ink3 transition-all group-hover:bg-emerald-500 group-hover:text-white">
                          <ChevronRightIcon className="size-3.5" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </motion.li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
