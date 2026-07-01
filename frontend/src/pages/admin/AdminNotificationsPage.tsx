import { Helmet } from "react-helmet-async";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { apiFetch } from "../../lib/api";
import { usePageTitle } from "../../hooks/usePageTitle";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  ORDER:    "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  STOCK:    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  USER:     "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  SYSTEM:   "bg-ink3/10 text-ink3",
  REVIEW:   "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  RETURN:   "bg-red-500/10 text-red-500",
};

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function AdminNotificationsPage() {
  usePageTitle("Notifications — Admin");
  const queryClient = useQueryClient();

  const { data: notifications, isPending } = useQuery<AdminNotification[]>({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const res = await apiFetch<{ data: AdminNotification[] }>("/api/v1/admin/notifications", { auth: true });
      return res.data ?? [];
    },
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const readOneMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/admin/notifications/${id}/read`, { method: "PATCH", auth: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] }),
  });

  const readAllMutation = useMutation({
    mutationFn: () => apiFetch("/api/v1/admin/notifications/read-all", { method: "PATCH", auth: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "notifications", "unread-count"] });
      toast.success("All notifications marked as read");
    },
  });

  const unread = (notifications ?? []).filter((n) => !n.read).length;

  return (
    <>
      <Helmet><title>Notifications — Admin · Northline</title></Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">
              Notifications
              {unread > 0 && (
                <span className="ml-2 inline-flex size-6 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </h1>
            <p className="mt-0.5 text-sm text-ink3">System alerts and activity notifications</p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => readAllMutation.mutate()}
              disabled={readAllMutation.isPending}
              className="rounded-xl border border-stroke bg-card px-4 py-2.5 text-sm font-medium text-ink3 hover:text-ink hover:bg-raised transition-colors disabled:opacity-50"
            >
              {readAllMutation.isPending ? "Marking…" : "Mark all as read"}
            </button>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-stroke bg-card">
          {isPending ? (
            <div className="space-y-px p-1">
              {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-lg bg-raised" />)}
            </div>
          ) : !notifications?.length ? (
            <div className="py-16 text-center">
              <svg className="mx-auto mb-3 size-8 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
              </svg>
              <p className="text-sm font-semibold text-ink">All caught up!</p>
              <p className="mt-1 text-sm text-ink3">No notifications to show.</p>
            </div>
          ) : (
            <div className="divide-y divide-stroke">
              {notifications.map((n, i) => (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors ${!n.read ? "bg-emerald-500/3" : ""}`}
                >
                  {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-emerald-500" />}
                  {n.read && <span className="mt-2 size-2 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-semibold ${n.read ? "text-ink3" : "text-ink"}`}>{n.title}</p>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TYPE_COLORS[n.type] ?? "bg-raised text-ink4"}`}>
                        {n.type}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-ink3">{n.message}</p>
                    <p className="mt-1 text-[11px] text-ink4">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => readOneMutation.mutate(n.id)}
                      className="shrink-0 rounded-lg border border-stroke px-3 py-1.5 text-[11px] font-medium text-ink4 hover:text-ink hover:bg-raised transition-colors"
                    >
                      Mark read
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
