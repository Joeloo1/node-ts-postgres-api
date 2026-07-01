import { useQuery } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "../../lib/api";
import { formatPrice } from "../../lib/pricing";
import { usePageTitle } from "../../hooks/usePageTitle";
import { ChartBarIcon, UsersIcon, PackageIcon, StarIcon } from "../../components/Icons";

type DashboardStats = {
  totalRevenue: number;
  totalOrders: number;
  totalUsers: number;
  totalProducts: number;
  revenueByDay: { date: string; revenue: number }[];
  ordersByStatus: { status: string; count: number }[];
  topProducts: { product_id: string; name: string; revenue: number; orders: number }[];
  recentActivity: { type: string; description: string; createdAt: string }[];
};

async function getDashboardStats(): Promise<DashboardStats> {
  const res = await apiFetch<{ status: string; data: DashboardStats }>("/api/v1/admin/analytics", { auth: true });
  return res.data;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING:    "#f59e0b",
  PAID:       "#3b82f6",
  PROCESSING: "#8b5cf6",
  SHIPPED:    "#0ea5e9",
  DELIVERED:  "#10b981",
  CANCELLED:  "#6b7280",
  REFUNDED:   "#3b82f6",
};

const PERIODS = ["7 days", "30 days", "90 days"] as const;
type Period = typeof PERIODS[number];

const TABS = ["Overview", "Revenue", "Customers", "Funnel"] as const;
type Tab = typeof TABS[number];

interface RevenueBreakdown {
  period: string;
  revenue: number;
  orders: number;
}

interface TopCustomer {
  userId: string;
  name: string;
  email: string;
  totalSpend: number;
  orderCount: number;
}

interface FunnelEvent {
  event: string;
  count: number;
}

async function getRevenueBreakdown(period: string, days: number): Promise<RevenueBreakdown[]> {
  const res = await apiFetch<{ data: RevenueBreakdown[] }>(`/api/v1/admin/analytics/revenue?period=${period}&days=${days}`, { auth: true });
  return res.data ?? [];
}

async function getTopCustomers(): Promise<TopCustomer[]> {
  const res = await apiFetch<{ data: TopCustomer[] }>("/api/v1/admin/analytics/top-customers?limit=20", { auth: true });
  return res.data ?? [];
}

async function getEventFunnel(days: number): Promise<FunnelEvent[]> {
  const res = await apiFetch<{ data: FunnelEvent[] }>(`/api/v1/admin/analytics/funnel?days=${days}`, { auth: true });
  return res.data ?? [];
}

function RevenueSparkline({ data }: { data: { date: string; revenue: number }[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const W = 600, H = 140;
  const pad = { top: 16, right: 16, bottom: 32, left: 48 };
  const iW = W - pad.left - pad.right;
  const iH = H - pad.top - pad.bottom;

  const maxVal = Math.max(...data.map((d) => d.revenue), 1);
  const pts = data.map((d, i) => ({
    x: pad.left + (i / Math.max(data.length - 1, 1)) * iW,
    y: pad.top + iH - (d.revenue / maxVal) * iH,
    revenue: d.revenue,
    date: d.date,
  }));

  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const fillD = pts.length ? `M ${pts[0].x} ${pad.top + iH} ${pathD.slice(1)} L ${pts[pts.length - 1].x} ${pad.top + iH} Z` : "";

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
    y: pad.top + iH - t * iH,
    label: formatPrice(maxVal * t),
  }));

  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t) => (
        <g key={t.y}>
          <line x1={pad.left} x2={W - pad.right} y1={t.y} y2={t.y} stroke="currentColor" strokeOpacity="0.1" />
          <text x={pad.left - 6} y={t.y + 4} fill="currentColor" fillOpacity="0.4" fontSize="10" textAnchor="end">{t.label}</text>
        </g>
      ))}
      {fillD && <path d={fillD} fill="url(#revenueGrad)" />}
      {pathD && <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#10b981" />
      ))}
    </svg>
  );
}

export function AdminAnalyticsPage() {
  usePageTitle("Analytics — Admin");
  const [period, setPeriod] = useState<Period>("30 days");
  const [tab, setTab] = useState<Tab>("Overview");

  const { data: stats, isPending } = useQuery({
    queryKey: ["admin", "analytics", period],
    queryFn: getDashboardStats,
    staleTime: 5 * 60_000,
  });

  const periodDays = period === "7 days" ? 7 : period === "30 days" ? 30 : 90;
  const apiPeriod = period === "7 days" ? "daily" : period === "30 days" ? "daily" : "weekly";

  const { data: revenueBreakdown, isPending: revPending } = useQuery({
    queryKey: ["admin", "revenue-breakdown", apiPeriod, periodDays],
    queryFn: () => getRevenueBreakdown(apiPeriod, periodDays),
    staleTime: 5 * 60_000,
    enabled: tab === "Revenue",
  });

  const { data: topCustomers, isPending: custPending } = useQuery({
    queryKey: ["admin", "top-customers"],
    queryFn: getTopCustomers,
    staleTime: 5 * 60_000,
    enabled: tab === "Customers",
  });

  const { data: funnelData, isPending: funnelPending } = useQuery({
    queryKey: ["admin", "funnel", periodDays],
    queryFn: () => getEventFunnel(periodDays),
    staleTime: 5 * 60_000,
    enabled: tab === "Funnel",
  });

  const filteredRevenue = useMemo(() => {
    if (!stats?.revenueByDay) return [];
    const days = period === "7 days" ? 7 : period === "30 days" ? 30 : 90;
    return stats.revenueByDay.slice(-days);
  }, [stats, period]);

  const totalRevenue = filteredRevenue.reduce((s, d) => s + d.revenue, 0);
  const prevRevenue = useMemo(() => {
    if (!stats?.revenueByDay) return 0;
    const days = period === "7 days" ? 7 : period === "30 days" ? 30 : 90;
    const prev = stats.revenueByDay.slice(-(days * 2), -days);
    return prev.reduce((s, d) => s + d.revenue, 0);
  }, [stats, period]);
  const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  const KPI_CARDS = [
    {
      label: "Total revenue",
      value: stats ? formatPrice(stats.totalRevenue) : "—",
      icon: ChartBarIcon,
      color: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Total orders",
      value: stats ? stats.totalOrders.toLocaleString() : "—",
      icon: PackageIcon,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Total users",
      value: stats ? stats.totalUsers.toLocaleString() : "—",
      icon: UsersIcon,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-500/10",
    },
    {
      label: "Active products",
      value: stats ? stats.totalProducts.toLocaleString() : "—",
      icon: StarIcon,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <>
      <Helmet>
        <title>Analytics — Admin · Northline</title>
        <meta name="description" content="Revenue, orders, and product performance analytics." />
      </Helmet>

      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Analytics</h1>
            <p className="mt-0.5 text-sm text-ink3">Store performance at a glance</p>
          </div>
          <div className="flex gap-1 rounded-xl border border-stroke bg-raised p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  period === p ? "bg-card text-ink shadow-sm" : "text-ink4 hover:text-ink2"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-stroke">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                  : "border-transparent text-ink4 hover:text-ink3"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && (<>
        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {KPI_CARDS.map((card) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-stroke bg-card p-4"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink4">{card.label}</p>
                <div className={`flex size-8 items-center justify-center rounded-lg ${card.bg}`}>
                  <card.icon className={`size-4 ${card.color}`} />
                </div>
              </div>
              {isPending ? (
                <div className="mt-2 h-7 w-24 animate-pulse rounded bg-raised" />
              ) : (
                <p className="mt-2 text-2xl font-bold text-ink">{card.value}</p>
              )}
            </motion.div>
          ))}
        </div>

        {/* Revenue chart */}
        <div className="rounded-xl border border-stroke bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-ink">Revenue over time</h2>
              <p className="text-xs text-ink4">
                {isPending ? "Loading…" : (
                  <>
                    {formatPrice(totalRevenue)} this period
                    {revenueChange !== 0 && (
                      <span className={`ml-1.5 font-semibold ${revenueChange > 0 ? "text-emerald-500" : "text-red-400"}`}>
                        {revenueChange > 0 ? "+" : ""}{revenueChange.toFixed(1)}% vs prev
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>
          {isPending ? (
            <div className="h-36 animate-pulse rounded-lg bg-raised" />
          ) : filteredRevenue.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink4">No revenue data yet.</p>
          ) : (
            <RevenueSparkline data={filteredRevenue} />
          )}
        </div>

        {/* Bottom grid */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Orders by status */}
          <div className="rounded-xl border border-stroke bg-card p-5">
            <h2 className="mb-4 font-semibold text-ink">Orders by status</h2>
            {isPending ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-7 animate-pulse rounded bg-raised" />
                ))}
              </div>
            ) : !stats?.ordersByStatus?.length ? (
              <p className="text-sm text-ink4">No order data.</p>
            ) : (
              <div className="space-y-2">
                {stats.ordersByStatus.map(({ status, count }) => {
                  const total = stats.ordersByStatus.reduce((s, o) => s + o.count, 0);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-ink3">{status}</span>
                        <span className="tabular-nums text-ink4">{count}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-raised">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: STATUS_COLORS[status] ?? "#6b7280" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top products */}
          <div className="rounded-xl border border-stroke bg-card p-5">
            <h2 className="mb-4 font-semibold text-ink">Top products by revenue</h2>
            {isPending ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 animate-pulse rounded bg-raised" />
                ))}
              </div>
            ) : !stats?.topProducts?.length ? (
              <p className="text-sm text-ink4">No product data.</p>
            ) : (
              <div className="space-y-3">
                {stats.topProducts.slice(0, 6).map((p, i) => (
                  <div key={p.product_id} className="flex items-center gap-3">
                    <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-bold text-ink4">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{p.name}</p>
                      <p className="text-[11px] text-ink4">{p.orders} orders</p>
                    </div>
                    <p className="shrink-0 text-sm font-bold text-ink">{formatPrice(p.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        </>)}

        {tab === "Revenue" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">Revenue breakdown</h2>
            {revPending ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-raised" />)}</div>
            ) : !revenueBreakdown?.length ? (
              <div className="rounded-xl border border-stroke bg-card py-16 text-center text-sm text-ink4">No revenue data for this period.</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stroke bg-card">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b border-stroke bg-raised/50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Period</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink4">Revenue</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink4">Orders</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink4">Avg order</th>
                  </tr></thead>
                  <tbody className="divide-y divide-stroke">
                    {revenueBreakdown.map((row) => (
                      <tr key={row.period} className="hover:bg-raised/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-ink">{row.period}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-ink">{formatPrice(row.revenue)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink3">{row.orders}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink3">{row.orders > 0 ? formatPrice(row.revenue / row.orders) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Customers" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">Top customers by spend</h2>
            {custPending ? (
              <div className="space-y-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-raised" />)}</div>
            ) : !topCustomers?.length ? (
              <div className="rounded-xl border border-stroke bg-card py-16 text-center text-sm text-ink4">No customer data yet.</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stroke bg-card">
                <table className="min-w-full text-sm">
                  <thead><tr className="border-b border-stroke bg-raised/50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">#</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Customer</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink4">Total spend</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink4">Orders</th>
                    <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-ink4">Avg order</th>
                  </tr></thead>
                  <tbody className="divide-y divide-stroke">
                    {topCustomers.map((c, i) => (
                      <motion.tr key={c.userId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="hover:bg-raised/40 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex size-6 items-center justify-center rounded-full bg-raised text-[11px] font-bold text-ink4">{i + 1}</div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-ink">{c.name}</p>
                          <p className="text-[11px] text-ink4">{c.email}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums text-ink">{formatPrice(c.totalSpend)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink3">{c.orderCount}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-ink3">{c.orderCount > 0 ? formatPrice(c.totalSpend / c.orderCount) : "—"}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === "Funnel" && (
          <div className="space-y-4">
            <h2 className="font-semibold text-ink">Conversion funnel</h2>
            {funnelPending ? (
              <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-raised" />)}</div>
            ) : !funnelData?.length ? (
              <div className="rounded-xl border border-stroke bg-card py-16 text-center text-sm text-ink4">No funnel data for this period.</div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-stroke bg-card p-5">
                <div className="space-y-3">
                  {(() => {
                    const max = Math.max(...funnelData.map((f) => Number(f.count)), 1);
                    return funnelData.map((f, i) => {
                      const pct = (Number(f.count) / max) * 100;
                      const drop = i > 0 ? ((Number(funnelData[i - 1].count) - Number(f.count)) / Math.max(Number(funnelData[i - 1].count), 1)) * 100 : null;
                      return (
                        <div key={f.event}>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-ink">{f.event.replace(/_/g, " ")}</span>
                            <div className="flex items-center gap-3">
                              {drop !== null && drop > 0 && (
                                <span className="text-red-400">-{drop.toFixed(1)}%</span>
                              )}
                              <span className="tabular-nums font-bold text-ink">{Number(f.count).toLocaleString()}</span>
                            </div>
                          </div>
                          <div className="h-2 rounded-full bg-raised">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                              style={{ width: `${pct}%`, opacity: 1 - i * 0.1 }}
                            />
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </>
  );
}
