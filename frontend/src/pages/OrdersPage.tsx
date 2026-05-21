import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { OrdersSkeleton } from "../components/ProductSkeleton";
import { apiFetch } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { productImageUrl } from "../lib/productImage";
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
  CANCELLED:  { label: "Cancelled",  className: "bg-well text-ink4 border-edge/40" },
};

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const rowFade: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] } },
};

export function OrdersPage() {
  usePageTitle("Orders");
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
      <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center">
        <p className="text-sm text-red-300">{(error as Error).message}</p>
      </div>
    );
  }

  const orders = data ?? [];

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-stroke bg-card py-20 text-center">
        <PackageIcon className="size-14 text-ink4" />
        <h1 className="mt-5 font-display text-2xl font-bold text-ink">No orders yet</h1>
        <p className="mt-2 text-ink4">When you check out, your orders appear here.</p>
        <Link to="/products" className="mt-8 inline-flex rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Orders</h1>
        <p className="mt-1 text-sm text-ink4">{orders.length} order{orders.length !== 1 ? "s" : ""} total</p>
      </div>

      <motion.ul className="space-y-3" variants={stagger} initial="hidden" animate="show">
        {orders.map((o) => {
          const status = statusStyles[o.status] ?? { label: o.status, className: "bg-well text-ink3" };
          const thumbs = (o.items ?? [])
            .slice(0, 3)
            .map((item) => item.product ? productImageUrl(item.product as { name: string; image: string | null; images?: string[] | null }) : null)
            .filter(Boolean) as string[];
          const extraCount = (o.items?.length ?? 0) - thumbs.length;

          return (
            <motion.li key={o.id} variants={rowFade}>
              <Link
                to={`/orders/${o.id}`}
                className="group flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stroke bg-card px-5 py-4 transition-all hover:border-edge hover:bg-raised"
              >
                {/* Left: order info + thumbnails */}
                <div className="flex items-center gap-4 min-w-0">
                  {/* Product thumbnails */}
                  {thumbs.length > 0 && (
                    <div className="flex -space-x-2 shrink-0">
                      {thumbs.map((src, i) => (
                        <div
                          key={i}
                          className="size-11 overflow-hidden rounded-xl border-2 border-raised bg-well"
                          style={{ zIndex: thumbs.length - i }}
                        >
                          <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                        </div>
                      ))}
                      {extraCount > 0 && (
                        <div className="flex size-11 items-center justify-center rounded-xl border-2 border-raised bg-well text-xs font-semibold text-ink3">
                          +{extraCount}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="font-mono text-xs text-ink4">#{o.id.slice(0, 8).toUpperCase()}</p>
                    <p className="mt-0.5 text-sm text-ink3">
                      {new Date(o.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                    <p className="mt-0.5 text-xs text-ink4">
                      {o.items?.length ?? 0} item{(o.items?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Right: status + total */}
                <div className="flex items-center gap-4 shrink-0">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${status.className}`}>
                    {status.label}
                  </span>
                  <p className="text-lg font-bold tabular-nums text-ink">${o.total.toFixed(2)}</p>
                  <ChevronRightIcon className="size-4 text-ink4 transition-transform group-hover:translate-x-0.5 group-hover:text-ink3" />
                </div>
              </Link>
            </motion.li>
          );
        })}
      </motion.ul>
    </div>
  );
}
