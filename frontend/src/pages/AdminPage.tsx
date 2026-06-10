import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import * as analyticsService from "../services/analytics";
import type { Order, OrderStatus } from "../lib/types";
import type { RevenueDay } from "../services/analytics";
import {
  ChartBarIcon, PackageIcon, ShieldIcon, TagIcon, UsersIcon,
} from "../components/Icons";

/* ── Status badge colours ─────────────────────────── */
const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING:    "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20",
  PAID:       "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
  PROCESSING: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/20",
  SHIPPED:    "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/20",
  DELIVERED:  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  CANCELLED:  "bg-well text-ink4 border-edge/40",
  REFUNDED:   "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

const NAV = [
  { to: "/admin/products",   label: "Products",   icon: PackageIcon },
  { to: "/admin/users",      label: "Users",       icon: UsersIcon },
  { to: "/admin/categories", label: "Categories",  icon: TagIcon },
  { to: "/admin/orders",     label: "Orders",      icon: ChartBarIcon },
];

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all border ${
    isActive
      ? "bg-raised text-ink border-edge"
      : "text-ink3 hover:bg-hover hover:text-ink border-transparent"
  }`;

/* ── SVG Revenue Chart ─────────────────────────────── */
function RevenueChart({ data }: { data: RevenueDay[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 800;
  const H = 200;
  const PAD = { top: 16, right: 24, bottom: 32, left: 56 };

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const filled = useMemo(() => {
    if (!data.length) return [];
    const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
    const byDate = new Map(sorted.map((d) => [d.date, d.revenue]));
    const days: RevenueDay[] = [];
    const start = new Date(Date.now() - 29 * 86400000);
    for (let i = 0; i < 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      days.push({ date: key, revenue: byDate.get(key) ?? 0 });
    }
    return days;
  }, [data]);

  const maxRevenue = Math.max(...filled.map((d) => d.revenue), 1);

  const xScale = (i: number) => PAD.left + (i / (filled.length - 1)) * innerW;
  const yScale = (v: number) => PAD.top + innerH - (v / maxRevenue) * innerH;

  const polyline = filled.map((d, i) => `${xScale(i)},${yScale(d.revenue)}`).join(" ");
  const area = `${PAD.left},${PAD.top + innerH} ${polyline} ${xScale(filled.length - 1)},${PAD.top + innerH}`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    y: PAD.top + innerH - f * innerH,
    label: `$${(f * maxRevenue).toFixed(0)}`,
  }));

  const xLabels = filled
    .map((d, i) => ({ i, d }))
    .filter((_, idx) => idx % 5 === 0 || idx === filled.length - 1);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg || !filled.length) return;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * W;
    const pxPerStep = innerW / (filled.length - 1);
    const idx = Math.round((mx - PAD.left) / pxPerStep);
    setHovered(Math.max(0, Math.min(filled.length - 1, idx)));
  }

  const hoveredPoint = hovered !== null ? filled[hovered] : null;
  const hoveredX = hovered !== null ? xScale(hovered) : 0;
  const hoveredY = hoveredPoint ? yScale(hoveredPoint.revenue) : 0;

  if (!filled.length) return (
    <div className="flex h-40 items-center justify-center text-sm text-ink4">No revenue data yet</div>
  );

  return (
    <div className="relative select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y grid lines */}
        {yTicks.map(({ y, label }) => (
          <g key={y}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="currentColor" strokeOpacity="0.07" strokeWidth="1" />
            <text x={PAD.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="currentColor" opacity="0.4">{label}</text>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map(({ i, d }) => (
          <text key={i} x={xScale(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.4">
            {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </text>
        ))}

        {/* Area fill */}
        <polygon points={area} fill="url(#chartFill)" />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Hover crosshair */}
        {hovered !== null && hoveredPoint && (
          <g>
            <line x1={hoveredX} y1={PAD.top} x2={hoveredX} y2={PAD.top + innerH} stroke="#10b981" strokeWidth="1" strokeDasharray="4,3" strokeOpacity="0.5" />
            <circle cx={hoveredX} cy={hoveredY} r="4.5" fill="#10b981" />
            <circle cx={hoveredX} cy={hoveredY} r="8" fill="#10b981" fillOpacity="0.2" />
          </g>
        )}
      </svg>

      {/* Tooltip */}
      {hovered !== null && hoveredPoint && (
        <div
          className="pointer-events-none absolute rounded-lg border border-stroke bg-card px-3 py-2 shadow-lg"
          style={{
            left: `calc(${(hoveredX / W) * 100}% - 64px)`,
            top: `${(hoveredY / H) * 100}%`,
            transform: "translateY(-120%)",
          }}
        >
          <p className="text-[11px] text-ink4">
            {new Date(hoveredPoint.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>
          <p className="text-sm font-bold text-ink">${hoveredPoint.revenue.toFixed(2)}</p>
        </div>
      )}
    </div>
  );
}

/* ── Admin Dashboard ───────────────────────────────── */
type AdminOrdersRes = {
  status: string;
  results: number;
  total: number;
  data: { orders: Order[] };
};

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function AdminDashboard() {
  const queryClient = useQueryClient();
  const [refreshedAt, setRefreshedAt] = useState<Date>(() => new Date());
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.analytics() });
    queryClient.invalidateQueries({ queryKey: ["admin-orders-recent"] });
    queryClient.invalidateQueries({ queryKey: ["admin-orders-all"] });
    queryClient.invalidateQueries({ queryKey: ["admin-low-stock"] });
    setRefreshedAt(new Date());
  }

  const analyticsQ = useQuery({
    queryKey: queryKeys.analytics(),
    queryFn: analyticsService.getDashboardStats,
    staleTime: 5 * 60_000,
  });

  const ordersQ = useQuery({
    queryKey: ["admin-orders-recent"],
    queryFn: async () => {
      const res = await apiFetch<AdminOrdersRes>("/api/v1/admin/orders?limit=8&sortBy=createdAt&order=desc", { auth: true });
      return res;
    },
    staleTime: 60_000,
  });

  const allOrdersQ = useQuery({
    queryKey: ["admin-orders-all"],
    queryFn: async () => {
      const res = await apiFetch<AdminOrdersRes>("/api/v1/admin/orders?limit=500&sortBy=createdAt&order=desc", { auth: true });
      return res.data.orders;
    },
    staleTime: 120_000,
  });

  const lowStockQ = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: async () => {
      type Pr = { status: string; data: { products: { product_id: string; name: string; stock?: number; price: number; image: string | null }[] }; pagination: { total: number } };
      const res = await apiFetch<Pr>("/api/v1/products?limit=100&sortBy=stock&order=asc");
      return res.data.products.filter((p) => (p.stock ?? 999) < 5 && (p.stock ?? 999) >= 0);
    },
    staleTime: 60_000,
  });

  const totals       = analyticsQ.data?.totals;
  const revenueByDay = analyticsQ.data?.revenueByDay ?? [];
  const topProducts  = analyticsQ.data?.topProducts  ?? [];
  const recentOrders = ordersQ.data?.data.orders ?? [];
  const allOrders    = allOrdersQ.data ?? [];
  const lowStock     = lowStockQ.data ?? [];

  const statsCards = [
    {
      label: "Total revenue",
      value: totals ? `$${totals.revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—",
      sub: "From paid & delivered orders",
      icon: ChartBarIcon,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      to: "/admin/orders",
    },
    {
      label: "Total orders",
      value: totals ? String(totals.orders) : "—",
      sub: totals ? `${totals.recentOrders} in the last 30 days` : "Loading…",
      icon: PackageIcon,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      to: "/admin/orders",
    },
    {
      label: "Customers",
      value: totals ? String(totals.users) : "—",
      sub: "Registered accounts",
      icon: UsersIcon,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
      to: "/admin/users",
    },
    {
      label: "Products",
      value: totals ? String(totals.products) : "—",
      sub: "In the catalog",
      icon: TagIcon,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
      to: "/admin/products",
    },
  ];

  const anyFetching = analyticsQ.isFetching || ordersQ.isFetching || allOrdersQ.isFetching || lowStockQ.isFetching;

  return (
    <div className="space-y-8">

      {/* Refresh toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-ink4">
          Updated {timeAgo(refreshedAt)}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={anyFetching}
          className="flex items-center gap-1.5 rounded-lg border border-stroke bg-card px-3 py-1.5 text-xs font-medium text-ink3 transition-colors hover:bg-raised hover:text-ink disabled:opacity-50"
        >
          <svg
            className={`size-3.5 ${anyFetching ? "animate-spin" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
          {anyFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statsCards.map(({ label, value, sub, icon: Icon, color, bg, to }) => {
          const content = (
            <div className="space-y-3">
              <div className={`flex size-9 items-center justify-center rounded-lg ${bg}`}>
                <Icon className={`size-4.5 ${color}`} />
              </div>
              <div>
                {analyticsQ.isPending ? (
                  <>
                    <div className="mb-1 h-6 w-24 animate-shimmer rounded" />
                    <div className="h-3 w-16 animate-shimmer rounded" />
                  </>
                ) : (
                  <>
                    <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
                    <p className="mt-0.5 text-xs font-medium text-ink">{label}</p>
                    <p className="text-[11px] text-ink4">{sub}</p>
                  </>
                )}
              </div>
            </div>
          );
          return (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className="overflow-hidden rounded-xl border border-stroke bg-card p-5 transition-all hover:border-emerald-500/25 hover:shadow-md hover:shadow-black/5"
            >
              <Link to={to} className="block">{content}</Link>
            </motion.div>
          );
        })}
      </div>

      {/* Revenue chart */}
      <div className="overflow-hidden rounded-xl border border-stroke bg-card">
        <div className="flex items-center justify-between border-b border-stroke px-5 py-4">
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">Revenue over time</h2>
            <p className="text-[11px] text-ink4">Last 30 days · paid and delivered orders</p>
          </div>
          {totals && (
            <div className="text-right">
              <p className="text-lg font-bold tabular-nums text-ink">
                ${totals.revenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[11px] text-ink4">Total revenue</p>
            </div>
          )}
        </div>
        <div className="p-4 pb-2">
          {analyticsQ.isPending ? (
            <div className="h-44 animate-shimmer rounded-lg" />
          ) : (
            <RevenueChart data={revenueByDay} />
          )}
        </div>
      </div>

      {/* Recent orders + Top products */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Recent orders</h2>
            <Link
              to="/admin/orders"
              className="text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
            >
              View all →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-stroke bg-card">
            {ordersQ.isPending ? (
              <div className="divide-y divide-stroke">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <div className="h-3 w-28 animate-shimmer rounded" />
                    <div className="ml-auto h-3 w-16 animate-shimmer rounded" />
                    <div className="h-5 w-16 animate-shimmer rounded-full" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="p-6 text-center text-sm text-ink4">No orders yet.</p>
            ) : (
              <div className="divide-y divide-stroke">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-hover">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] font-semibold text-ink">#{o.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-[11px] text-ink4">
                        {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}{o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[o.status as OrderStatus] ?? "bg-well text-ink4 border-edge"}`}>
                      {o.status}
                    </span>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-ink">${o.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-base font-semibold text-ink">Top products</h2>
            <Link
              to="/admin/products"
              className="text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
            >
              View all →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-stroke bg-card">
            {analyticsQ.isPending ? (
              <div className="divide-y divide-stroke">
                {[1,2,3,4,5].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="size-8 animate-shimmer rounded-lg" />
                    <div className="h-3 flex-1 animate-shimmer rounded" />
                    <div className="h-3 w-12 animate-shimmer rounded" />
                  </div>
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="p-5 text-center text-sm text-ink4">No order data yet.</div>
            ) : (
              <div className="divide-y divide-stroke">
                {topProducts.map(({ product_id, name, image, unitsSold }, i) => (
                  <div key={product_id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-5 shrink-0 items-center justify-center text-[11px] font-bold text-ink4">
                      {i + 1}
                    </span>
                    <div className="size-8 shrink-0 overflow-hidden rounded-lg bg-raised">
                      {image ? (
                        <img src={image} alt={name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <PackageIcon className="size-4 text-ink4" />
                        </div>
                      )}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{name}</p>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-bold text-ink">{unitsSold}</p>
                      <p className="text-[10px] text-ink4">sold</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Low stock + Order by status */}
      <div className="grid gap-6 lg:grid-cols-2">

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-semibold text-ink">Low stock alerts</h2>
              {lowStock.length > 0 && (
                <span className="rounded-full bg-red-500/12 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                  {lowStock.length}
                </span>
              )}
            </div>
            <Link
              to="/admin/products"
              className="text-xs font-medium text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
            >
              Manage →
            </Link>
          </div>
          <div className="overflow-hidden rounded-xl border border-stroke bg-card">
            {lowStockQ.isPending ? (
              <div className="p-4 text-sm text-ink4">Loading…</div>
            ) : lowStock.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">✓ All products have healthy stock</p>
              </div>
            ) : (
              <div className="divide-y divide-stroke">
                {lowStock.map((p) => (
                  <div key={p.product_id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      (p.stock ?? 0) === 0 ? "bg-red-500/12 text-red-600 dark:text-red-400" : "bg-amber-500/12 text-amber-700 dark:text-amber-400"
                    }`}>
                      {(p.stock ?? 0) === 0 ? "OUT" : `${p.stock} left`}
                    </div>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{p.name}</p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-ink">${p.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold text-ink">Orders by status</h2>
          <div className="space-y-3 overflow-hidden rounded-xl border border-stroke bg-card p-4">
            {allOrdersQ.isPending ? (
              <div className="space-y-3">
                {[1,2,3,4,5,6].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 w-24 animate-shimmer rounded" />
                    <div className="h-1.5 w-full animate-shimmer rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              (["PENDING","PAID","PROCESSING","SHIPPED","DELIVERED","CANCELLED"] as OrderStatus[]).map((s) => {
                const count = allOrders.filter((o) => o.status === s).length;
                const total = Math.max(allOrders.length, 1);
                const COLORS: Record<string, string> = {
                  PENDING: "bg-amber-400", PAID: "bg-blue-400", PROCESSING: "bg-violet-400",
                  SHIPPED: "bg-sky-400", DELIVERED: "bg-emerald-500", CANCELLED: "bg-edge",
                };
                return (
                  <div key={s} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-ink3">{s.charAt(0) + s.slice(1).toLowerCase()}</span>
                      <span className="tabular-nums font-semibold text-ink">{count}</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${COLORS[s] ?? "bg-emerald-500"}`}
                        style={{ width: `${(count / total) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Admin Page Shell ──────────────────────────────── */
export function AdminPage() {
  const location = useLocation();
  const isRoot = location.pathname === "/admin";

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start gap-3"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <ShieldIcon className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Admin</h1>
          <p className="mt-0.5 text-sm text-ink4">Manage products, users, categories, and orders.</p>
        </div>
      </motion.div>

      <motion.nav
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.07 }}
        className="flex flex-wrap gap-2 rounded-xl border border-stroke bg-card p-2"
        aria-label="Admin sections"
      >
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={tabClass}>
            <Icon className="size-4" />
            {label}
          </NavLink>
        ))}
      </motion.nav>

      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      >
        {isRoot ? <AdminDashboard /> : <Outlet />}
      </motion.div>
    </div>
  );
}
