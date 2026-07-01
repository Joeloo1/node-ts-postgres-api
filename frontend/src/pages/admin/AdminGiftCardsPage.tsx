import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";
import { formatPrice } from "../../lib/pricing";

interface GiftCard {
  id: string;
  code: string;
  amount: number;
  balance: number;
  expiresAt: string | null;
  active: boolean;
  purchasedBy: { name: string; email: string } | null;
  createdAt: string;
}

function StatusBadge({ gc }: { gc: GiftCard }) {
  if (!gc.active) return <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500">Revoked</span>;
  if (gc.expiresAt && new Date(gc.expiresAt) < new Date()) return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">Expired</span>;
  if (gc.balance <= 0) return <span className="rounded-full border border-edge/40 bg-well px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink4">Depleted</span>;
  return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Active</span>;
}

export function AdminGiftCardsPage() {
  usePageTitle("Gift Cards — Admin");
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: giftCards, isPending } = useQuery<GiftCard[]>({
    queryKey: ["admin", "gift-cards"],
    queryFn: async () => {
      const res = await apiFetch<{ data: GiftCard[] }>("/api/v1/admin/gift-cards", { auth: true });
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/admin/gift-cards/${id}/revoke`, { method: "PATCH", auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "gift-cards"] });
      toast.success("Gift card revoked");
    },
    onError: () => toast.error("Failed to revoke gift card"),
  });

  const filtered = (giftCards ?? []).filter((gc) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return gc.code.toLowerCase().includes(q) || gc.purchasedBy?.email.toLowerCase().includes(q) || gc.purchasedBy?.name.toLowerCase().includes(q);
  });

  return (
    <>
      <Helmet><title>Gift Cards — Admin · Northline</title></Helmet>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Gift Cards</h1>
            <p className="mt-0.5 text-sm text-ink3">View and manage issued gift cards</p>
          </div>
          <div className="w-full sm:w-72">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code or buyer…"
              className="w-full rounded-xl border border-stroke bg-input px-4 py-2.5 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition-colors"
            />
          </div>
        </div>

        {/* Summary */}
        {!isPending && giftCards && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total issued", value: giftCards.length.toString() },
              { label: "Active", value: giftCards.filter((g) => g.active && g.balance > 0 && (!g.expiresAt || new Date(g.expiresAt) > new Date())).length.toString() },
              { label: "Total value", value: formatPrice(giftCards.reduce((s, g) => s + g.amount, 0)) },
              { label: "Outstanding", value: formatPrice(giftCards.filter((g) => g.active).reduce((s, g) => s + g.balance, 0)) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-xl border border-stroke bg-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-ink4">{label}</p>
                <p className="mt-1.5 text-xl font-bold tabular-nums text-ink">{value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-stroke bg-card">
          {isPending ? (
            <div className="space-y-px p-1">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-raised" />)}
            </div>
          ) : !filtered.length ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink">{search ? "No results" : "No gift cards yet"}</p>
              <p className="mt-1 text-sm text-ink3">{search ? "Try a different code or name." : "Gift cards appear here when customers purchase them."}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stroke bg-raised/50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Code</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Buyer</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Value / Balance</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Expires</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {filtered.map((gc, i) => (
                    <motion.tr
                      key={gc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className="hover:bg-raised/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-sm font-bold text-ink">{gc.code}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {gc.purchasedBy ? (
                          <>
                            <p className="font-medium text-ink">{gc.purchasedBy.name}</p>
                            <p className="text-[11px] text-ink4">{gc.purchasedBy.email}</p>
                          </>
                        ) : (
                          <span className="text-ink4">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        <p className="font-semibold text-ink">{formatPrice(gc.balance)}</p>
                        <p className="text-[11px] text-ink4">of {formatPrice(gc.amount)}</p>
                      </td>
                      <td className="px-4 py-3.5 text-ink3">
                        {gc.expiresAt ? new Date(gc.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Never"}
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge gc={gc} /></td>
                      <td className="px-4 py-3.5 text-right">
                        {gc.active && (
                          <button
                            type="button"
                            onClick={() => { if (confirm(`Revoke gift card ${gc.code}? This cannot be undone.`)) revokeMutation.mutate(gc.id); }}
                            className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/8 transition-colors"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
