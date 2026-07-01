import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { OrdersSkeleton } from "../components/ProductSkeleton";
import { queryKeys } from "../lib/queryKeys";
import * as orderService from "../services/orders";
import { usePageTitle } from "../hooks/usePageTitle";
import { productImageUrl } from "../lib/productImage";
import type { OrderStatus } from "../lib/types";
import { ChevronRightIcon, PackageIcon, SearchIcon, XIcon } from "../components/Icons";

const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  PENDING:    { label: "Pending",    dot: "bg-amber-400",   badge: "border-amber-500/20 bg-amber-500/8 text-amber-600 dark:text-amber-400" },
  PAID:       { label: "Paid",       dot: "bg-emerald-400", badge: "border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400" },
  PROCESSING: { label: "Processing", dot: "bg-sky-400",     badge: "border-sky-500/20 bg-sky-500/8 text-sky-600 dark:text-sky-400" },
  SHIPPED:    { label: "Shipped",    dot: "bg-violet-400",  badge: "border-violet-500/20 bg-violet-500/8 text-violet-600 dark:text-violet-400" },
  DELIVERED:  { label: "Delivered",  dot: "bg-emerald-400", badge: "border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-300" },
  CANCELLED:  { label: "Cancelled",  dot: "bg-ink4",        badge: "border-edge/40 bg-well text-ink4" },
  REFUNDED:   { label: "Refunded",   dot: "bg-blue-400",    badge: "border-blue-500/20 bg-blue-500/8 text-blue-600 dark:text-blue-400" },
};

const returnStatusConfig: Record<string, { label: string; className: string }> = {
  PENDING:   { label: "Return pending",   className: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  APPROVED:  { label: "Return approved",  className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  REJECTED:  { label: "Return rejected",  className: "border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400" },
  COMPLETED: { label: "Return completed", className: "border-blue-500/25 bg-blue-500/10 text-blue-600 dark:text-blue-400" },
};

const FILTER_TABS: Array<{ value: OrderStatus | "ALL"; label: string }> = [
  { value: "ALL",        label: "All orders" },
  { value: "PENDING",    label: "Pending" },
  { value: "PAID",       label: "Paid" },
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

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: diffDays > 365 ? "numeric" : undefined });
}

type SortKey = "newest" | "oldest" | "highest" | "lowest";

export function OrdersPage() {
  usePageTitle("Orders");
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchText), 200);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: queryKeys.orders(),
    queryFn: orderService.getOrders,
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

  if (orders.length === 0) {
    return (
      <div>
        <div className="mb-8">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">History</p>
          <h1 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Your orders</h1>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-24 text-center">
          <div className="flex size-24 items-center justify-center rounded-3xl bg-raised text-ink4">
            <PackageIcon className="size-12" />
          </div>
          <h2 className="mt-5 text-base font-semibold text-ink">No orders yet</h2>
          <p className="mt-1.5 text-sm text-ink4">When you place your first order, it will show up here.</p>
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

  const filtered = orders
    .filter((o) => filter === "ALL" || o.status === filter)
    .filter((o) => {
      if (!debouncedSearch.trim()) return true;
      const q = debouncedSearch.toLowerCase();
      return (
        o.id.slice(0, 8).toUpperCase().includes(q.toUpperCase()) ||
        o.items.some((i) => i.product?.name?.toLowerCase().includes(q))
      );
    })
    .slice()
    .sort((a, b) => {
      if (sortKey === "oldest")  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortKey === "highest") return b.total - a.total;
      if (sortKey === "lowest")  return a.total - b.total;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); // newest
    });

  const totalSpent = orders
    .filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED")
    .reduce((sum, o) => sum + o.total, 0);
  const deliveredCount = orders.filter((o) => o.status === "DELIVERED").length;
  const activeCount = orders.filter((o) =>
    ["PENDING", "PAID", "PROCESSING", "SHIPPED"].includes(o.status),
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">History</p>
        <h1 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">Your orders</h1>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilter("ALL")}
          className="relative rounded-xl border border-stroke bg-card px-4 py-3 text-left transition-colors hover:border-emerald-500/30 hover:bg-raised"
        >
          <div className="absolute right-3 top-3">
            <svg className="size-4 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" /></svg>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">Total orders</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink">{orders.length}</p>
        </button>
        <div className="relative rounded-xl border border-stroke bg-card px-4 py-3">
          <div className="absolute right-3 top-3">
            <svg className="size-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">Total spent</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink">${totalSpent.toFixed(2)}</p>
        </div>
        <div className="relative rounded-xl border border-stroke bg-card px-4 py-3">
          <div className="absolute right-3 top-3">
            <svg className="size-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" /></svg>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">Active</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink">{activeCount}</p>
        </div>
        <button
          type="button"
          onClick={() => setFilter("DELIVERED")}
          className="relative rounded-xl border border-stroke bg-card px-4 py-3 text-left transition-colors hover:border-emerald-500/30 hover:bg-raised"
        >
          <div className="absolute right-3 top-3">
            <svg className="size-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">Delivered</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-ink">{deliveredCount}</p>
        </button>
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink4" />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by order ID or product name…"
            className="w-full rounded-xl border border-stroke bg-input py-2.5 pl-9 pr-9 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/25"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 transition-colors hover:text-ink"
            >
              <XIcon className="size-3.5" />
            </button>
          )}
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="shrink-0 rounded-lg border border-stroke bg-card px-3 py-2.5 text-sm text-ink focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/25"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="highest">Highest value</option>
          <option value="lowest">Lowest value</option>
        </select>
      </div>

      {/* Filter tabs */}
      <div className="-mx-4 sm:mx-0">
        <div className="flex overflow-x-auto border-b border-stroke scrollbar-none">
          {FILTER_TABS.map(({ value, label }) => {
            const count = value === "ALL" ? orders.length : orders.filter((o) => o.status === value).length;
            if (count === 0 && value !== "ALL") return null;
            const active = filter === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`relative shrink-0 px-4 py-3 text-[13px] font-medium transition-colors ${active ? "text-ink" : "text-ink4 hover:text-ink3"}`}
              >
                <span className="flex items-center gap-2">
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums font-semibold ${active ? "bg-raised text-ink3" : "text-ink4/60"}`}>
                    {count}
                  </span>
                </span>
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

      {/* Orders list */}
      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty-filter"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-stroke bg-card py-16 text-center"
          >
            <p className="text-sm text-ink4">
              {searchText ? `No orders matching "${searchText}".` : `No ${filter.toLowerCase()} orders.`}
            </p>
            <button
              type="button"
              onClick={() => { setFilter("ALL"); setSearchText(""); }}
              className="mt-3 text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
            >
              Show all orders
            </button>
          </motion.div>
        ) : (
          <motion.ul key={filter + debouncedSearch + sortKey} className="space-y-3" variants={stagger} initial="hidden" animate="show">
            {filtered.map((o) => {
              const status = statusConfig[o.status] ?? { label: o.status, dot: "bg-ink4", badge: "border-edge bg-well text-ink3" };
              const thumbs = (o.items ?? [])
                .slice(0, 4)
                .map((item) => item.product ? productImageUrl(item.product as { name: string; image: string | null; images?: string[] | null }) : null)
                .filter(Boolean) as string[];
              const extraCount = (o.items?.length ?? 0) - thumbs.length;
              const itemCount = o.items?.length ?? 0;
              const productNames = (o.items ?? [])
                .slice(0, 2)
                .map((i) => i.product?.name)
                .filter(Boolean) as string[];
              const moreProducts = itemCount - productNames.length;

              return (
                <motion.li key={o.id} variants={rowFade}>
                  <Link
                    to={`/orders/${o.id}`}
                    className="group block overflow-hidden rounded-2xl border border-stroke bg-card transition-all duration-200 hover:border-edge hover:shadow-lg hover:shadow-black/8"
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between border-b border-stroke bg-raised/30 px-5 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${status.badge}`}>
                        <span className={`size-1.5 shrink-0 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                      <div className="flex items-center gap-3">
                        <p className="text-[12px] text-ink4">
                          {relativeDate(o.createdAt)}
                        </p>
                        <p className="hidden text-[11px] text-ink4 sm:block">
                          {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex items-center gap-4 px-5 py-4">
                      {thumbs.length > 0 && (
                        <div className="flex shrink-0 -space-x-2.5">
                          {thumbs.map((src, i) => (
                            <div key={i} className="size-12 overflow-hidden rounded-xl border-2 border-card bg-raised shadow-sm" style={{ zIndex: thumbs.length - i }}>
                              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                            </div>
                          ))}
                          {extraCount > 0 && (
                            <div className="flex size-12 items-center justify-center rounded-xl border-2 border-card bg-raised text-[11px] font-semibold text-ink3 shadow-sm">
                              +{extraCount}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink">
                          Order <span className="font-mono text-[13px] text-ink2">#{o.id.slice(0, 8).toUpperCase()}</span>
                        </p>
                        {productNames.length > 0 ? (
                          <p className="mt-0.5 truncate text-xs text-ink4">
                            {productNames.join(", ")}
                            {moreProducts > 0 && ` +${moreProducts} more`}
                          </p>
                        ) : (
                          <p className="mt-0.5 text-xs text-ink4">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <p className="text-base font-bold tabular-nums text-ink">${o.total.toFixed(2)}</p>
                        <div className="flex size-8 items-center justify-center rounded-full bg-raised text-ink3 transition-all group-hover:bg-emerald-500 group-hover:text-white">
                          <ChevronRightIcon className="size-3.5" />
                        </div>
                      </div>
                    </div>

                    {/* Shipped banner */}
                    {o.status === "SHIPPED" && (
                      <div className="border-t border-violet-500/15 bg-violet-500/5 px-5 py-2">
                        <p className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 dark:text-violet-400">
                          <span className="size-1.5 rounded-full bg-violet-500 animate-pulse" />
                          Your order is on its way — check details for tracking info
                        </p>
                      </div>
                    )}

                    {/* Return status banner */}
                    {o.returnRequest && (() => {
                      const rc = returnStatusConfig[o.returnRequest.status];
                      if (!rc) return null;
                      return (
                        <div className={`border-t px-5 py-2 ${o.returnRequest.status === "PENDING" ? "border-amber-500/15 bg-amber-500/5" : o.returnRequest.status === "APPROVED" ? "border-emerald-500/15 bg-emerald-500/5" : o.returnRequest.status === "REJECTED" ? "border-red-500/15 bg-red-500/5" : "border-blue-500/15 bg-blue-500/5"}`}>
                          <p className={`flex items-center gap-1.5 text-[11px] font-semibold ${rc.className.split(" ").filter(c => c.startsWith("text-")).join(" ")}`}>
                            <span className={`size-1.5 shrink-0 rounded-full ${o.returnRequest.status === "APPROVED" ? "bg-emerald-500" : o.returnRequest.status === "REJECTED" ? "bg-red-500" : o.returnRequest.status === "COMPLETED" ? "bg-blue-500" : "bg-amber-500"}`} />
                            {rc.label}
                          </p>
                        </div>
                      );
                    })()}
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
