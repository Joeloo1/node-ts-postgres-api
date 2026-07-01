import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";
import { PlusIcon } from "../../components/Icons";

const TYPES = ["FLASH_SALE", "PERCENTAGE_OFF_CATEGORY"] as const;
type PromotionType = typeof TYPES[number];

interface Promotion {
  id: string;
  name: string;
  type: PromotionType;
  value: number;
  categoryId: string | null;
  startsAt: string;
  endsAt: string;
  active: boolean;
  category?: { name: string } | null;
  createdAt: string;
}

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3 py-2.5 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition-colors";

function statusBadge(p: Promotion) {
  const now = Date.now();
  const start = new Date(p.startsAt).getTime();
  const end = new Date(p.endsAt).getTime();
  if (!p.active) return <span className="rounded-full border border-edge/40 bg-well px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink4">Inactive</span>;
  if (now < start) return <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">Scheduled</span>;
  if (now > end) return <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500">Ended</span>;
  return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Live</span>;
}

interface Category { id: string; name: string }

function PromotionForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<PromotionType>("FLASH_SALE");
  const [value, setValue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const categoriesQ = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiFetch<{ status: string; data: { categories: Category[] } }>("/api/v1/categories");
      return res.data.categories;
    },
    staleTime: 5 * 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (body: object) => apiFetch("/api/v1/admin/promotions", { method: "POST", body: JSON.stringify(body), auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] });
      toast.success("Promotion created");
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to create promotion"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !value || !startsAt || !endsAt) return;
    createMutation.mutate({
      name: name.trim(),
      type,
      value: Number(value),
      categoryId: type === "PERCENTAGE_OFF_CATEGORY" && categoryId ? categoryId : undefined,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="overflow-hidden rounded-xl border border-emerald-500/25 bg-card"
    >
      <div className="border-b border-stroke px-5 py-4">
        <h3 className="font-display text-sm font-semibold text-ink">New promotion</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summer Flash Sale" className={inputClass} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Type *</label>
            <select value={type} onChange={(e) => setType(e.target.value as PromotionType)} className={inputClass}>
              {TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Discount % (0–100) *</label>
            <input type="number" min="0" max="100" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} placeholder="20" className={inputClass} required />
          </div>
          {type === "PERCENTAGE_OFF_CATEGORY" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-ink3">Category</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
                <option value="">— All categories —</option>
                {(categoriesQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Starts at *</label>
            <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Ends at *</label>
            <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} required />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-stroke bg-raised px-4 py-2 text-sm font-medium text-ink3 hover:text-ink transition-colors">Cancel</button>
          <button type="submit" disabled={createMutation.isPending} className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors">
            {createMutation.isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export function AdminPromotionsPage() {
  usePageTitle("Promotions — Admin");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: promotions, isPending } = useQuery<Promotion[]>({
    queryKey: ["admin", "promotions"],
    queryFn: async () => {
      const res = await apiFetch<{ data: Promotion[] }>("/api/v1/admin/promotions", { auth: true });
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/admin/promotions/${id}/toggle`, { method: "PATCH", auth: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] }); toast.success("Updated"); },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/admin/promotions/${id}`, { method: "DELETE", auth: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "promotions"] }); toast.success("Promotion deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  return (
    <>
      <Helmet><title>Promotions — Admin · Northline</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Promotions</h1>
            <p className="mt-0.5 text-sm text-ink3">Flash sales and category discounts</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
          >
            <PlusIcon className="size-4" />
            New promotion
          </button>
        </div>

        <AnimatePresence>
          {showForm && <PromotionForm onClose={() => setShowForm(false)} />}
        </AnimatePresence>

        <div className="overflow-hidden rounded-xl border border-stroke bg-card">
          {isPending ? (
            <div className="space-y-px p-1">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-lg bg-raised" />)}
            </div>
          ) : !promotions?.length ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink">No promotions yet</p>
              <p className="mt-1 text-sm text-ink3">Create one to start driving sales.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stroke bg-raised/50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Name</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Type</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Value</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Period</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {promotions.map((p) => (
                    <tr key={p.id} className="hover:bg-raised/40 transition-colors">
                      <td className="px-4 py-3.5 font-medium text-ink">{p.name}</td>
                      <td className="px-4 py-3.5 text-ink3">{p.type.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3.5 font-semibold tabular-nums text-ink">{p.value}%</td>
                      <td className="px-4 py-3.5 text-ink4">
                        <div className="text-xs">{new Date(p.startsAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                        <div className="text-[11px] text-ink4">→ {new Date(p.endsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                      </td>
                      <td className="px-4 py-3.5">{statusBadge(p)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleMutation.mutate(p.id)}
                            className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-ink3 hover:text-ink hover:bg-raised transition-colors"
                          >
                            {p.active ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { if (confirm("Delete this promotion?")) deleteMutation.mutate(p.id); }}
                            className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/8 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
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
