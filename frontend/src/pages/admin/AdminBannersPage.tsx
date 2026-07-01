import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { apiFetch, ApiError } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";
import { PlusIcon } from "../../components/Icons";

const POSITIONS = ["HOME_HERO", "DEALS_PAGE", "CATEGORY_PAGE", "SIDEBAR"] as const;
type BannerPosition = typeof POSITIONS[number];

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  position: BannerPosition;
  active: boolean;
  order: number;
  createdAt: string;
}

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3 py-2.5 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition-colors";

const POSITION_LABELS: Record<BannerPosition, string> = {
  HOME_HERO: "Home Hero",
  DEALS_PAGE: "Deals Page",
  CATEGORY_PAGE: "Category Page",
  SIDEBAR: "Sidebar",
};

function BannerForm({ editing, onClose }: { editing?: Banner; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(editing?.title ?? "");
  const [imageUrl, setImageUrl] = useState(editing?.imageUrl ?? "");
  const [linkUrl, setLinkUrl] = useState(editing?.linkUrl ?? "");
  const [position, setPosition] = useState<BannerPosition>(editing?.position ?? "HOME_HERO");
  const [order, setOrder] = useState(String(editing?.order ?? "0"));
  const [active, setActive] = useState(editing?.active ?? true);

  const saveMutation = useMutation({
    mutationFn: (body: object) =>
      editing
        ? apiFetch(`/api/v1/admin/banners/${editing.id}`, { method: "PATCH", body: JSON.stringify(body), auth: true })
        : apiFetch("/api/v1/admin/banners", { method: "POST", body: JSON.stringify(body), auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "banners"] });
      toast.success(editing ? "Banner updated" : "Banner created");
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to save banner"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) return;
    saveMutation.mutate({
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      linkUrl: linkUrl.trim() || null,
      position,
      order: Number(order),
      active,
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
        <h3 className="font-display text-sm font-semibold text-ink">{editing ? "Edit banner" : "New banner"}</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink3">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Summer Sale — Up to 50% off" className={inputClass} required />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink3">Image URL *</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://…/banner.jpg" className={inputClass} required />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-ink3">Link URL</label>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="/deals" className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Position *</label>
            <select value={position} onChange={(e) => setPosition(e.target.value as BannerPosition)} className={inputClass}>
              {POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABELS[p]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Sort order</label>
            <input type="number" min="0" value={order} onChange={(e) => setOrder(e.target.value)} className={inputClass} />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActive((a) => !a)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${active ? "bg-emerald-500" : "bg-raised"}`}
            >
              <span className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transition-transform ${active ? "translate-x-4" : "translate-x-0"}`} />
            </button>
            <span className="text-sm text-ink3">Active</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-stroke bg-raised px-4 py-2 text-sm font-medium text-ink3 hover:text-ink transition-colors">Cancel</button>
          <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors">
            {saveMutation.isPending ? "Saving…" : editing ? "Save changes" : "Create"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export function AdminBannersPage() {
  usePageTitle("Banners — Admin");
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);

  const { data: banners, isPending } = useQuery<Banner[]>({
    queryKey: ["admin", "banners"],
    queryFn: async () => {
      const res = await apiFetch<{ data: Banner[] }>("/api/v1/admin/banners", { auth: true });
      return res.data ?? [];
    },
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/admin/banners/${id}`, { method: "DELETE", auth: true }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin", "banners"] }); toast.success("Banner deleted"); },
    onError: () => toast.error("Failed to delete"),
  });

  function openEdit(b: Banner) {
    setEditing(b);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  return (
    <>
      <Helmet><title>Banners — Admin · Northline</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">Banners</h1>
            <p className="mt-0.5 text-sm text-ink3">Manage promotional banners across the site</p>
          </div>
          <button
            type="button"
            onClick={() => { setEditing(null); setShowForm((s) => !s); }}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors"
          >
            <PlusIcon className="size-4" />
            New banner
          </button>
        </div>

        <AnimatePresence>
          {showForm && <BannerForm editing={editing ?? undefined} onClose={closeForm} />}
        </AnimatePresence>

        <div className="overflow-hidden rounded-xl border border-stroke bg-card">
          {isPending ? (
            <div className="space-y-px p-1">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-raised" />)}
            </div>
          ) : !banners?.length ? (
            <div className="py-16 text-center">
              <p className="text-sm font-semibold text-ink">No banners yet</p>
              <p className="mt-1 text-sm text-ink3">Create one to start promoting content.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-stroke bg-raised/50">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Banner</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Position</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Order</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-ink4">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-stroke">
                  {banners.map((b) => (
                    <tr key={b.id} className="hover:bg-raised/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          {b.imageUrl && (
                            <img src={b.imageUrl} alt="" className="size-10 shrink-0 rounded-lg object-cover bg-raised" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          )}
                          <div>
                            <p className="font-medium text-ink">{b.title}</p>
                            {b.linkUrl && <p className="text-[11px] text-ink4 truncate max-w-[200px]">{b.linkUrl}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-ink3">{POSITION_LABELS[b.position]}</td>
                      <td className="px-4 py-3.5 tabular-nums text-ink4">{b.order}</td>
                      <td className="px-4 py-3.5">
                        {b.active
                          ? <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Active</span>
                          : <span className="rounded-full border border-edge/40 bg-well px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink4">Inactive</span>
                        }
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => openEdit(b)} className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-ink3 hover:text-ink hover:bg-raised transition-colors">Edit</button>
                          <button type="button" onClick={() => { if (confirm("Delete this banner?")) deleteMutation.mutate(b.id); }} className="rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/8 transition-colors">Delete</button>
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
