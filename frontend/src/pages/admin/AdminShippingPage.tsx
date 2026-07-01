import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";
import { PlusIcon } from "../../components/Icons";
import { formatPrice } from "../../lib/pricing";

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  flatRate: number;
  freeThreshold: number | null;
  createdAt: string;
}

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3 py-2.5 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition-colors";

function ZoneForm({ editing, onClose }: { editing?: ShippingZone; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(editing?.name ?? "");
  const [countries, setCountries] = useState(editing?.countries.join(", ") ?? "");
  const [flatRate, setFlatRate] = useState(String(editing?.flatRate ?? ""));
  const [freeThreshold, setFreeThreshold] = useState(String(editing?.freeThreshold ?? ""));

  const saveMutation = useMutation({
    mutationFn: (body: object) =>
      editing
        ? apiFetch(`/api/v1/admin/shipping/zones/${editing.id}`, { method: "PATCH", body: JSON.stringify(body), auth: true })
        : apiFetch("/api/v1/admin/shipping/zones", { method: "POST", body: JSON.stringify(body), auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "shipping-zones"] });
      toast.success(editing ? "Zone updated" : "Zone created");
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to save zone"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !flatRate) return;
    const countryList = countries.split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
    saveMutation.mutate({
      name: name.trim(),
      countries: countryList,
      flatRate: Number(flatRate),
      freeThreshold: freeThreshold ? Number(freeThreshold) : null,
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
        <h3 className="font-display text-sm font-semibold text-ink">{editing ? "Edit zone" : "New shipping zone"}</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink3">Zone name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Domestic — Continental US" className={inputClass} required />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink3">Countries (comma-separated ISO codes)</label>
            <input value={countries} onChange={(e) => setCountries(e.target.value)} placeholder="US, CA, MX" className={inputClass} />
            <p className="mt-1 text-[11px] text-ink4">Leave blank to apply to all countries.</p>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Flat rate ($) *</label>
            <input type="number" min="0" step="0.01" value={flatRate} onChange={(e) => setFlatRate(e.target.value)} placeholder="9.99" className={inputClass} required />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Free shipping threshold ($)</label>
            <input type="number" min="0" step="0.01" value={freeThreshold} onChange={(e) => setFreeThreshold(e.target.value)} placeholder="50.00" className={inputClass} />
            <p className="mt-1 text-[11px] text-ink4">Leave blank to never offer free shipping.</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-stroke bg-raised px-4 py-2 text-sm font-medium text-ink3 hover:text-ink transition-colors">Cancel</button>
          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors">
            {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Create zone"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export function AdminShippingPage() {
  usePageTitle("Shipping — Admin");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ShippingZone | null>(null);

  const { data: zones, isPending } = useQuery<ShippingZone[]>({
    queryKey: ["admin", "shipping-zones"],
    queryFn: async () => {
      const res = await apiFetch<{ data: ShippingZone[] }>("/api/v1/admin/shipping/zones", { auth: true });
      return res.data ?? [];
    },
    staleTime: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/admin/shipping/zones/${id}`, { method: "DELETE", auth: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "shipping-zones"] }); toast.success("Zone deleted"); },
    onError: () => toast.error("Failed to delete zone"),
  });

  function openEdit(z: ShippingZone) {
    setEditing(z);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <>
      <Helmet><title>Shipping Zones — Admin · Northline</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Shipping Zones</h1>
            <p className="mt-0.5 text-sm text-ink3">Configure rates and free shipping thresholds by region</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(null); setShowForm((s) => !s); }}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
          >
            <PlusIcon className="size-4" />
            New zone
          </button>
        </div>

        <AnimatePresence>
          {showForm && <ZoneForm editing={editing ?? undefined} onClose={closeForm} />}
        </AnimatePresence>

        <div className="overflow-hidden rounded-xl border border-stroke bg-card">
          {isPending ? (
            <div className="space-y-px p-1">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-raised" />)}
            </div>
          ) : !zones?.length ? (
            <div className="py-16 text-center">
              <svg className="mx-auto mb-3 size-8 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
              </svg>
              <p className="text-sm font-semibold text-ink">No shipping zones</p>
              <p className="mt-1 text-sm text-ink3">Create a zone to define shipping rates.</p>
            </div>
          ) : (
            <div className="divide-y divide-stroke">
              {zones.map((z) => (
                <div key={z.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 hover:bg-raised/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-ink">{z.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-ink3">
                      <span>Flat rate: <strong className="text-ink">{formatPrice(z.flatRate)}</strong></span>
                      {z.freeThreshold != null && (
                        <span>Free over: <strong className="text-ink">{formatPrice(z.freeThreshold)}</strong></span>
                      )}
                      {z.countries.length > 0 && (
                        <span className="text-ink4">
                          {z.countries.slice(0, 5).join(", ")}{z.countries.length > 5 ? ` +${z.countries.length - 5}` : ""}
                        </span>
                      )}
                      {z.countries.length === 0 && <span className="text-ink4">All countries</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => openEdit(z)} className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-ink3 hover:text-ink hover:bg-raised transition-colors">Edit</button>
                    <button type="button" onClick={() => { if (confirm(`Delete zone "${z.name}"?`)) deleteMutation.mutate(z.id); }} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/8 transition-colors">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
