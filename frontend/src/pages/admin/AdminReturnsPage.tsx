import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { apiFetch } from "../../lib/http";
import { formatPrice } from "../../lib/pricing";
import { usePageTitle } from "../../hooks/usePageTitle";
import { SearchIcon, CheckCircleIcon, PackageIcon } from "../../components/Icons";

type ReturnRequest = {
  id: string;
  orderId: string;
  userId: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  createdAt: string;
  order?: {
    total: number;
    items: { quantity: number; product?: { name: string } }[];
  };
  user?: { name: string; email: string };
};

type ReturnsRes = { status: string; data: { returns: ReturnRequest[] } };

async function getReturns(): Promise<ReturnRequest[]> {
  const res = await apiFetch<ReturnsRes>("/api/v1/admin/returns", { auth: true });
  return res.data.returns;
}

async function updateReturn(id: string, status: ReturnRequest["status"]): Promise<void> {
  await apiFetch(`/api/v1/admin/returns/${id}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ status }),
  });
}

const STATUS_STYLES: Record<ReturnRequest["status"], string> = {
  PENDING:   "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  APPROVED:  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  REJECTED:  "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  COMPLETED: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
};

export function AdminReturnsPage() {
  usePageTitle("Returns — Admin");
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnRequest["status"] | "ALL">("ALL");

  const RETURNS_KEY = ["admin", "returns"] as const;

  const { data: returns = [], isPending } = useQuery({
    queryKey: RETURNS_KEY,
    queryFn: getReturns,
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReturnRequest["status"] }) =>
      updateReturn(id, status),
    onSuccess: (_, { status }) => {
      toast.success(`Return ${status.toLowerCase()}.`);
      void qc.invalidateQueries({ queryKey: RETURNS_KEY });
    },
    onError: () => toast.error("Could not update return request."),
  });

  const filtered = returns.filter((r) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.orderId.toLowerCase().includes(q) ||
      r.user?.name?.toLowerCase().includes(q) ||
      r.user?.email?.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q);
    const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    ALL: returns.length,
    PENDING: returns.filter((r) => r.status === "PENDING").length,
    APPROVED: returns.filter((r) => r.status === "APPROVED").length,
    REJECTED: returns.filter((r) => r.status === "REJECTED").length,
    COMPLETED: returns.filter((r) => r.status === "COMPLETED").length,
  };

  return (
    <>
      <Helmet>
        <title>Returns — Admin · Northline</title>
        <meta name="description" content="Manage customer return requests." />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">Returns</h1>
          <p className="mt-0.5 text-sm text-ink3">
            {returns.length} return request{returns.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Status tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-xl border border-stroke bg-raised p-1">
          {(["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === s ? "bg-card text-ink shadow-sm" : "text-ink4 hover:text-ink2"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
              <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                statusFilter === s ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-raised text-ink4"
              }`}>
                {counts[s]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink4" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order ID, customer, or reason…"
            className="w-full rounded-xl border border-stroke bg-input py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Returns list */}
        {isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-raised" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center">
            <PackageIcon className="mb-3 size-10 text-ink4" />
            <p className="text-sm font-semibold text-ink">No return requests</p>
            <p className="text-xs text-ink4">{search ? "Try a different search." : "All clear!"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ret) => (
              <motion.div
                key={ret.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-stroke bg-card p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-bold text-ink">#{ret.orderId.slice(0, 8)}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[ret.status]}`}>
                        {ret.status}
                      </span>
                      <span className="text-[11px] text-ink4">
                        {new Date(ret.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
                      </span>
                    </div>
                    {ret.user && (
                      <p className="text-xs text-ink3">
                        <span className="font-medium">{ret.user.name}</span>
                        {" · "}{ret.user.email}
                      </p>
                    )}
                    {ret.order && (
                      <p className="text-xs text-ink4">
                        {ret.order.items.reduce((s, i) => s + i.quantity, 0)} item(s) · {formatPrice(ret.order.total)}
                      </p>
                    )}
                    <p className="text-sm text-ink3">
                      <span className="font-medium text-ink">Reason:</span> {ret.reason}
                    </p>
                  </div>

                  {ret.status === "PENDING" && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ id: ret.id, status: "REJECTED" })}
                        disabled={updateMutation.isPending}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-60"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => updateMutation.mutate({ id: ret.id, status: "APPROVED" })}
                        disabled={updateMutation.isPending}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircleIcon className="size-3.5" />
                        Approve
                      </button>
                    </div>
                  )}

                  {ret.status === "APPROVED" && (
                    <button
                      type="button"
                      onClick={() => updateMutation.mutate({ id: ret.id, status: "COMPLETED" })}
                      disabled={updateMutation.isPending}
                      className="shrink-0 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-60"
                    >
                      Mark completed
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
