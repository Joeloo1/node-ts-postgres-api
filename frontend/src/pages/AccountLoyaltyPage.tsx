import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryKeys";
import * as loyaltyService from "../services/loyalty";
import type { LoyaltyTier } from "../services/loyalty";
import { StarIcon, CheckCircleIcon } from "../components/Icons";

const TIER_COLORS: Record<LoyaltyTier, string> = {
  BRONZE: "from-amber-700 to-amber-800",
  SILVER: "from-zinc-500 to-zinc-600",
  GOLD: "from-amber-500 to-yellow-600",
  PLATINUM: "from-teal-500 to-emerald-600",
};

const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 5000,
};

const TYPE_LABELS: Record<string, string> = {
  EARNED: "Points earned",
  REDEEMED: "Points redeemed",
  BONUS: "Bonus points",
  EXPIRED: "Points expired",
};

export function AccountLoyaltyPage() {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.loyalty(),
    queryFn: loyaltyService.getMyLoyalty,
  });

  if (isPending) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl bg-raised animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-stroke bg-card p-8 text-center">
        <p className="text-sm text-ink3">Could not load loyalty info. Please refresh.</p>
      </div>
    );
  }

  const tierKeys = Object.keys(TIER_THRESHOLDS) as LoyaltyTier[];
  const tierIndex = tierKeys.indexOf(data.tier);
  const nextTier = tierKeys[tierIndex + 1] as LoyaltyTier | undefined;
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;
  const currentThreshold = TIER_THRESHOLDS[data.tier];
  const progress = nextThreshold
    ? Math.min(((data.lifetimePoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100, 100)
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Loyalty & Points</h2>
        <p className="mt-1 text-sm text-ink3">
          Earn 1 point per $1 spent. 100 points = $1 off at checkout.
        </p>
      </div>

      {/* Tier card */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${TIER_COLORS[data.tier]} p-6 text-white`}>
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Available balance</p>
              <p className="mt-1 text-4xl font-bold tabular-nums">{data.points.toLocaleString()}</p>
              <p className="mt-1 text-sm text-white/70">points · worth ${data.redemptionValue.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <div className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
                {data.tier}
              </div>
              <p className="mt-2 text-xs text-white/50">{data.lifetimePoints.toLocaleString()} lifetime pts</p>
            </div>
          </div>

          {nextTier && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-white/60 mb-1.5">
                <span>{data.tier}</span>
                <span>{nextTier} at {TIER_THRESHOLDS[nextTier].toLocaleString()} pts</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white/80 transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-white/60">
                {(TIER_THRESHOLDS[nextTier] - data.lifetimePoints).toLocaleString()} more lifetime points to reach {nextTier}
              </p>
            </div>
          )}

          {!nextTier && (
            <div className="mt-4 flex items-center gap-2">
              <CheckCircleIcon className="size-4 text-white/70" />
              <p className="text-sm text-white/70">You've reached the highest tier!</p>
            </div>
          )}
        </div>
      </div>

      {/* Redeem CTA */}
      <Link
        to="/cart"
        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 py-3.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-500/12"
      >
        <StarIcon className="size-4" filled />
        Redeem at checkout
      </Link>

      {/* Transaction history */}
      <div className="rounded-2xl border border-stroke bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-stroke flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">Points history</p>
          <p className="text-xs text-ink4">{data.transactions.length} transactions</p>
        </div>

        {data.transactions.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <StarIcon className="mx-auto mb-3 size-8 text-ink4" />
            <p className="text-sm font-semibold text-ink">No activity yet</p>
            <p className="mt-1 text-sm text-ink3">Points will appear here after your first order.</p>
          </div>
        ) : (
          <div className="divide-y divide-stroke">
            {data.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3.5">
                <div className="min-w-0">
                  <p className="text-sm text-ink">{tx.description || TYPE_LABELS[tx.type] || tx.type}</p>
                  <p className="text-xs text-ink4 mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </p>
                </div>
                <span className={`ml-4 shrink-0 text-sm font-bold tabular-nums ${
                  tx.points > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-ink3"
                }`}>
                  {tx.points > 0 ? "+" : ""}{tx.points.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
