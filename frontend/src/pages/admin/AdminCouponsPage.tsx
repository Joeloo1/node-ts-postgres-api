import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { queryKeys } from "../../lib/queryKeys";
import { ApiError } from "../../lib/api";
import * as couponService from "../../services/coupons";
import type { CreateCouponInput, Coupon } from "../../services/coupons";
import { formatPrice } from "../../lib/pricing";
import { usePageTitle } from "../../hooks/usePageTitle";
import { PlusIcon, CheckIcon } from "../../components/Icons";

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3 py-2.5 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition-colors";

function CouponBadge({ coupon }: { coupon: Coupon }) {
  const isExpired = coupon.expiresAt ? new Date(coupon.expiresAt) < new Date() : false;
  const isFull = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses;

  if (!coupon.active) return <span className="rounded-full border border-edge/40 bg-well px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink4">Inactive</span>;
  if (isExpired) return <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-500">Expired</span>;
  if (isFull) return <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Maxed out</span>;
  return <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">Active</span>;
}

function CreateCouponForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENTAGE" | "FIXED">("PERCENTAGE");
  const [value, setValue] = useState("");
  const [minOrder, setMinOrder] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const createMutation = useMutation({
    mutationFn: (input: CreateCouponInput) => couponService.adminCreateCoupon(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCoupons() });
      toast.success("Coupon created");
      onClose();
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to create coupon"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !value) return;
    createMutation.mutate({
      code: code.trim().toUpperCase(),
      type,
      value: Number(value),
      minOrderTotal: minOrder ? Number(minOrder) : undefined,
      maxUses: maxUses ? Number(maxUses) : undefined,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      active: true,
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
        <h3 className="font-display text-sm font-semibold text-ink">New coupon</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Code *</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="SUMMER20"
              className={inputClass}
              required
              spellCheck={false}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Type *</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "PERCENTAGE" | "FIXED")}
              className={inputClass}
            >
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="FIXED">Fixed ($)</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">
              Value * {type === "PERCENTAGE" ? "(%)" : "($)"}
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max={type === "PERCENTAGE" ? "100" : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={type === "PERCENTAGE" ? "20" : "10.00"}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Min order total ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Max uses</label>
            <input
              type="number"
              min="1"
              step="1"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              placeholder="Unlimited"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-ink3">Expires at</label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={createMutation.isPending || !code.trim() || !value}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {createMutation.isPending ? (
              <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            ) : <PlusIcon className="size-4" />}
            Create coupon
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-ink3 transition-colors hover:bg-hover hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </form>
    </motion.div>
  );
}

export function AdminCouponsPage() {
  usePageTitle("Coupons · Admin");
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const couponsQ = useQuery({
    queryKey: queryKeys.adminCoupons(),
    queryFn: couponService.adminListCoupons,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      couponService.adminToggleCoupon(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.adminCoupons() }),
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to update coupon"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => couponService.adminDeleteCoupon(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminCoupons() });
      toast.success("Coupon deleted");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to delete coupon"),
  });

  const coupons = couponsQ.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-semibold text-ink">Coupons</h2>
          <p className="text-xs text-ink4">{coupons.length} coupon{coupons.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <PlusIcon className="size-4" />
          New coupon
        </button>
      </div>

      <AnimatePresence>
        {showCreate && <CreateCouponForm onClose={() => setShowCreate(false)} />}
      </AnimatePresence>

      <div className="overflow-hidden rounded-xl border border-stroke bg-card">
        {couponsQ.isPending ? (
          <div className="divide-y divide-stroke">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-3 w-28 animate-shimmer rounded" />
                <div className="ml-auto h-3 w-16 animate-shimmer rounded" />
                <div className="h-5 w-14 animate-shimmer rounded-full" />
              </div>
            ))}
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center py-14 text-center">
            <div className="flex size-12 items-center justify-center rounded-xl bg-raised text-ink4">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6M9.75 9.75h.008v.008H9.75V9.75Zm4.5 4.5h.008v.008h-.008v-.008Zm-9.22 5.47A2.25 2.25 0 0 0 6.75 15.75V5.25A2.25 2.25 0 0 1 9 3h10.5A2.25 2.25 0 0 1 21.75 5.25v10.5A2.25 2.25 0 0 1 19.5 18H9a2.25 2.25 0 0 1-1.97-1.28Z" />
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-ink">No coupons yet</p>
            <p className="mt-1 text-xs text-ink4">Create your first discount coupon above</p>
          </div>
        ) : (
          <div className="divide-y divide-stroke">
            {coupons.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center gap-3 px-5 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-bold tracking-wider text-ink">{c.code}</span>
                    <CouponBadge coupon={c} />
                  </div>
                  <p className="mt-0.5 text-xs text-ink4">
                    {c.type === "PERCENTAGE" ? `${c.value}% off` : `${formatPrice(c.value)} off`}
                    {c.minOrderTotal ? ` · min ${formatPrice(c.minOrderTotal)}` : ""}
                    {c.maxUses ? ` · ${c.usedCount}/${c.maxUses} used` : c.usedCount > 0 ? ` · ${c.usedCount} used` : ""}
                    {c.expiresAt ? ` · expires ${new Date(c.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}
                  </p>
                </div>

                {/* Toggle active */}
                <button
                  type="button"
                  onClick={() => toggleMutation.mutate({ id: c.id, active: !c.active })}
                  disabled={toggleMutation.isPending}
                  title={c.active ? "Deactivate" : "Activate"}
                  className={`flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                    c.active
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                      : "border-stroke bg-raised text-ink4 hover:bg-hover"
                  }`}
                >
                  <CheckIcon className="size-3.5" />
                </button>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm(`Delete coupon ${c.code}?`)) return;
                    deleteMutation.mutate(c.id);
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-stroke bg-raised text-ink4 transition-colors hover:border-red-500/30 hover:bg-red-500/8 hover:text-red-500"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
