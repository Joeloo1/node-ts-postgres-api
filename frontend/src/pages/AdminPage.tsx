import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiFetch } from "../lib/api";
import type { Order, OrderStatus } from "../lib/types";
import {
  ChartBarIcon, PackageIcon, ShieldIcon, TagIcon, UsersIcon,
} from "../components/Icons";

type AdminOrdersRes = { status: string; results: number; total: number; data: { orders: Order[] } };
type UsersRes       = { status: string; data: { users: { id: string }[] } };
type ProductsRes    = { status: string; data: { products: { product_id: string; name: string; stock?: number; price: number; image: string | null }[] }; pagination: { total: number } };

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

function AdminDashboard() {
  const ordersQ = useQuery({
    queryKey: ["admin-orders-stats"],
    queryFn: async () => {
      const res = await apiFetch<AdminOrdersRes>("/api/v1/admin/orders?limit=100", { auth: true });
      return res;
    },
    staleTime: 60_000,
  });

  const usersQ = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await apiFetch<UsersRes>("/api/v1/admin/users", { auth: true });
      return res.data.users;
    },
    staleTime: 60_000,
  });

  const productsQ = useQuery({
    queryKey: ["products-count"],
    queryFn: async () => {
      const res = await apiFetch<ProductsRes>("/api/v1/products?limit=1");
      return res.pagination?.total ?? 0;
    },
    staleTime: 60_000,
  });

  const lowStockQ = useQuery({
    queryKey: ["admin-low-stock"],
    queryFn: async () => {
      const res = await apiFetch<ProductsRes>("/api/v1/products?limit=100&sortBy=stock&order=asc");
      return res.data.products.filter((p) => (p.stock ?? 999) < 5 && (p.stock ?? 999) >= 0);
    },
    staleTime: 60_000,
  });

  const orders  = ordersQ.data?.data.orders ?? [];
  const revenue = orders
    .filter((o) => o.status === "DELIVERED" || o.status === "PAID" || o.status === "PROCESSING" || o.status === "SHIPPED")
    .reduce((s, o) => s + o.total, 0);

  const statusCounts = orders.reduce<Partial<Record<OrderStatus, number>>>((acc, o) => {
    acc[o.status as OrderStatus] = (acc[o.status as OrderStatus] ?? 0) + 1;
    return acc;
  }, {});

  const stats = [
    {
      label: "Total revenue",
      value: ordersQ.isPending ? "—" : `$${revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: "From paid + delivered orders",
      icon: ChartBarIcon,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Total orders",
      value: ordersQ.isPending ? "—" : String(ordersQ.data?.total ?? orders.length),
      sub: `${statusCounts.PENDING ?? 0} pending`,
      icon: PackageIcon,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
    {
      label: "Customers",
      value: usersQ.isPending ? "—" : String(usersQ.data?.length ?? 0),
      sub: "Registered accounts",
      icon: UsersIcon,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
    {
      label: "Products",
      value: productsQ.isPending ? "—" : String(productsQ.data ?? 0),
      sub: "In the catalog",
      icon: TagIcon,
      color: "text-violet-500",
      bg: "bg-violet-500/10",
    },
  ];

  const recentOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 8);

  /* Best sellers: count product frequency across all orders */
  const productFreq: Record<string, { name: string; count: number; revenue: number }> = {};
  for (const o of orders) {
    for (const item of (o.items ?? [])) {
      const id = item.product_id;
      if (!productFreq[id]) {
        productFreq[id] = { name: (item.product as any)?.name ?? id.slice(0, 12), count: 0, revenue: 0 };
      }
      productFreq[id].count  += item.quantity;
      productFreq[id].revenue += item.price * item.quantity;
    }
  }
  const bestSellers = Object.entries(productFreq)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const lowStock = lowStockQ.data ?? [];

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-xl border border-stroke bg-card p-5 space-y-3">
            <div className={`flex size-9 items-center justify-center rounded-lg ${bg}`}>
              <Icon className={`size-4.5 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums text-ink">{value}</p>
              <p className="mt-0.5 text-xs font-medium text-ink">{label}</p>
              <p className="text-[11px] text-ink4">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Recent orders table */}
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold text-ink">Recent orders</h2>
          <div className="rounded-xl border border-stroke bg-card overflow-hidden">
            {ordersQ.isPending ? (
              <div className="space-y-0 divide-y divide-stroke">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="h-3 w-24 animate-shimmer rounded" />
                    <div className="h-3 w-16 animate-shimmer rounded ml-auto" />
                  </div>
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="p-6 text-sm text-center text-ink4">No orders yet.</p>
            ) : (
              <div className="divide-y divide-stroke">
                {recentOrders.map((o) => (
                  <div key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-[11px] text-ink4">#{o.id.slice(0,8).toUpperCase()}</p>
                      <p className="text-xs text-ink3">
                        {new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" · "}{o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[o.status as OrderStatus] ?? "bg-well text-ink4 border-edge"}`}>
                      {o.status}
                    </span>
                    <p className="text-sm font-bold tabular-nums text-ink">${o.total.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Orders by status */}
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold text-ink">By status</h2>
          <div className="rounded-xl border border-stroke bg-card p-4 space-y-2.5">
            {(["PENDING","PAID","PROCESSING","SHIPPED","DELIVERED","CANCELLED","REFUNDED"] as OrderStatus[]).map((s) => {
              const count = statusCounts[s] ?? 0;
              const total = orders.length || 1;
              return (
                <div key={s} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-ink3">{s.charAt(0) + s.slice(1).toLowerCase()}</span>
                    <span className="font-semibold tabular-nums text-ink">{count}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-raised">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Low stock + Best sellers */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low stock */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-semibold text-ink">Low stock alerts</h2>
            {lowStock.length > 0 && (
              <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400">
                {lowStock.length}
              </span>
            )}
          </div>
          <div className="rounded-xl border border-stroke bg-card overflow-hidden">
            {lowStockQ.isPending ? (
              <div className="p-4 text-sm text-ink4">Loading…</div>
            ) : lowStock.length === 0 ? (
              <div className="p-5 text-center">
                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">✓ All products have healthy stock</p>
              </div>
            ) : (
              <div className="divide-y divide-stroke">
                {lowStock.map((p) => (
                  <div key={p.product_id} className="flex items-center gap-3 px-4 py-3">
                    <div className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      (p.stock ?? 0) === 0 ? "bg-red-500/15 text-red-500" : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
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

        {/* Best sellers */}
        <div className="space-y-3">
          <h2 className="font-display text-base font-semibold text-ink">Best sellers</h2>
          <div className="rounded-xl border border-stroke bg-card overflow-hidden">
            {ordersQ.isPending ? (
              <div className="p-4 text-sm text-ink4">Loading…</div>
            ) : bestSellers.length === 0 ? (
              <div className="p-5 text-center text-sm text-ink4">No order data yet.</div>
            ) : (
              <div className="divide-y divide-stroke">
                {bestSellers.map(([id, { name, count, revenue }], i) => (
                  <div key={id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-raised text-[11px] font-bold text-ink3">
                      {i + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{name}</p>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-ink">{count} sold</p>
                      <p className="text-[11px] tabular-nums text-ink4">${revenue.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminPage() {
  const location = useLocation();
  const isRoot = location.pathname === "/admin";

  return (
    <div className="space-y-8">
      {/* Header */}
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

      {/* Tab nav */}
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
