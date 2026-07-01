import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "../hooks/usePageTitle";
import { useAuth } from "../context/AuthContext";
import { StarIcon, CheckCircleIcon, ShieldIcon, TruckIcon, TagIcon } from "../components/Icons";
import { queryKeys } from "../lib/queryKeys";
import * as loyaltyService from "../services/loyalty";
import type { LoyaltyTier } from "../services/loyalty";

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } },
};

const TIERS = [
  {
    name: "Bronze",
    color: "from-amber-700 to-amber-800",
    badge: "text-amber-200",
    points: "0–999",
    multiplier: "1×",
    perks: ["Birthday 5% discount", "Early access to sales", "Free standard shipping on $50+"],
  },
  {
    name: "Silver",
    color: "from-zinc-500 to-zinc-600",
    badge: "text-zinc-100",
    points: "1,000–4,999",
    multiplier: "1.5×",
    perks: ["Everything in Bronze", "Free shipping on all orders", "Priority customer support", "10% discount on birthday month"],
  },
  {
    name: "Gold",
    color: "from-amber-500 to-yellow-600",
    badge: "text-white",
    points: "5,000–9,999",
    multiplier: "2×",
    perks: ["Everything in Silver", "Early product access", "Exclusive Gold-only deals", "Free express shipping", "15% birthday discount"],
  },
  {
    name: "Platinum",
    color: "from-teal-500 to-emerald-600",
    badge: "text-white",
    points: "10,000+",
    multiplier: "3×",
    perks: ["Everything in Gold", "Personal shopping assistant", "Exclusive Platinum events", "20% birthday discount", "Free returns always"],
  },
];

const HOW_IT_WORKS = [
  { step: 1, icon: TagIcon, title: "Shop & earn", desc: "Earn 1 point for every $1 spent. Higher tiers earn more." },
  { step: 2, icon: StarIcon, title: "Climb tiers", desc: "Your tier is based on your total annual spend. Tiers reset each January." },
  { step: 3, icon: CheckCircleIcon, title: "Redeem rewards", desc: "100 points = $1 off. Redeem at checkout on any order." },
  { step: 4, icon: TruckIcon, title: "Enjoy perks", desc: "Unlock free shipping, early access, and exclusive discounts." },
];

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

function LoyaltyDashboard() {
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.loyalty(),
    queryFn: loyaltyService.getMyLoyalty,
  });

  if (isPending) {
    return (
      <div className="rounded-2xl border border-stroke bg-card p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 rounded-lg bg-raised animate-pulse" style={{ width: `${70 - i * 10}%` }} />
        ))}
      </div>
    );
  }

  if (isError || !data) return null;

  const tierIndex = Object.keys(TIER_THRESHOLDS).indexOf(data.tier);
  const nextTier = Object.keys(TIER_THRESHOLDS)[tierIndex + 1] as LoyaltyTier | undefined;
  const currentThreshold = TIER_THRESHOLDS[data.tier];
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : null;
  const progress = nextThreshold
    ? Math.min(((data.lifetimePoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100, 100)
    : 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* Balance card */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${TIER_COLORS[data.tier]} p-6 text-white`}>
        <div className="absolute -right-10 -top-10 size-40 rounded-full bg-white/5 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Your balance</p>
              <p className="mt-1 text-4xl font-bold tabular-nums">{data.points.toLocaleString()}</p>
              <p className="mt-1 text-sm text-white/70">points · worth ${data.redemptionValue.toFixed(2)}</p>
            </div>
            <div className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold backdrop-blur-sm">
              {data.tier}
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
              <p className="mt-1.5 text-xs text-white/60">
                {(TIER_THRESHOLDS[nextTier] - data.lifetimePoints).toLocaleString()} more points to {nextTier}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Transaction history */}
      {data.transactions.length > 0 && (
        <div className="rounded-2xl border border-stroke bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke">
            <p className="text-sm font-semibold text-ink">Recent activity</p>
          </div>
          <div className="divide-y divide-stroke">
            {data.transactions.slice(0, 8).map((tx) => (
              <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-ink">{tx.description}</p>
                  <p className="text-xs text-ink4 mt-0.5">
                    {new Date(tx.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <span className={`text-sm font-bold tabular-nums ${tx.points > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-ink3"}`}>
                  {tx.points > 0 ? "+" : ""}{tx.points.toLocaleString()} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Link
        to="/cart"
        className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 py-3 text-sm font-semibold text-emerald-700 dark:text-emerald-400 transition-colors hover:bg-emerald-500/12"
      >
        <StarIcon className="size-4" filled />
        Redeem points at checkout
      </Link>
    </motion.div>
  );
}

export function LoyaltyPage() {
  usePageTitle("Rewards");
  const { token } = useAuth();

  return (
    <>
      <Helmet>
        <title>Northline Rewards — Earn Points on Every Order</title>
        <meta name="description" content="Join Northline Rewards and earn points on every purchase. Unlock exclusive perks, free shipping, and discounts as you climb through Bronze, Silver, Gold, and Platinum tiers." />
        <meta property="og:title" content="Northline Rewards — Earn Points on Every Order" />
        <meta property="og:description" content="Join Northline Rewards and earn points on every purchase." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>

      <div className="space-y-16">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-teal-700 to-emerald-900 px-8 py-16 text-center"
        >
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 size-80 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 size-64 rounded-full bg-teal-300/10 blur-2xl" />
          </div>
          <div className="relative">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
              <StarIcon className="size-8 text-amber-300" filled />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-200">Northline Rewards</p>
            <h1 className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl">
              Every purchase earns points
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-lg text-white/70">
              Shop, earn, and unlock exclusive perks. The more you shop, the more you save.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              {token ? (
                <Link
                  to="/account/profile"
                  className="relative overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-50 active:scale-[0.97]"
                >
                  <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-emerald-400/[0.08] to-transparent" />
                  View my rewards
                </Link>
              ) : (
                <>
                  <Link
                    to="/register"
                    className="relative overflow-hidden rounded-xl bg-white px-6 py-3 text-sm font-bold text-emerald-700 shadow-lg shadow-emerald-900/20 transition-all hover:bg-emerald-50 active:scale-[0.97]"
                  >
                    <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-emerald-400/[0.08] to-transparent" />
                    Join for free
                  </Link>
                  <Link
                    to="/login"
                    className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/20 active:scale-[0.97]"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Live account dashboard — only for signed-in users */}
        {token && (
          <section>
            <h2 className="mb-4 font-display text-xl font-bold text-ink">Your rewards</h2>
            <LoyaltyDashboard />
          </section>
        )}

        {/* How it works */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">How it works</h2>
            <p className="mt-2 text-ink3">Four simple steps to start earning rewards</p>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {HOW_IT_WORKS.map(({ step, icon: Icon, title, desc }) => (
              <motion.div
                key={step}
                variants={item}
                className="relative overflow-hidden rounded-2xl border border-stroke bg-card p-5 text-center transition-all hover:border-edge hover:shadow-md"
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex size-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-sm shadow-emerald-500/40">
                  {step}
                </div>
                <div className="mx-auto mt-2 mb-3 flex size-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Icon className="size-6" />
                </div>
                <p className="font-semibold text-ink">{title}</p>
                <p className="mt-1.5 text-sm text-ink3">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* Tiers */}
        <section className="space-y-8">
          <div className="text-center">
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">Membership tiers</h2>
            <p className="mt-2 text-ink3">Climb higher for better rewards and multipliers</p>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {TIERS.map((tier) => (
              <motion.div key={tier.name} variants={item} className="overflow-hidden rounded-2xl border border-stroke bg-card">
                <div className={`bg-gradient-to-br ${tier.color} p-5`}>
                  <div className="flex items-center justify-between">
                    <p className={`font-display text-xl font-bold ${tier.badge}`}>{tier.name}</p>
                    <div className={`rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold ${tier.badge}`}>
                      {tier.multiplier} points
                    </div>
                  </div>
                  <p className={`mt-1 text-[12px] ${tier.badge} opacity-70`}>{tier.points} pts / year</p>
                </div>
                <div className="p-4 space-y-2">
                  {tier.perks.map((perk) => (
                    <div key={perk} className="flex items-start gap-2 text-[13px] text-ink3">
                      <CheckCircleIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
                      {perk}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-2xl space-y-4">
          <h2 className="font-display text-xl font-bold text-ink">Common questions</h2>
          {[
            { q: "When do points expire?", a: "Points expire 12 months after being earned if no purchase is made." },
            { q: "Can I use points and a coupon together?", a: "Yes! Points redemption and coupon codes can both be applied at checkout." },
            { q: "How do I check my points balance?", a: "Sign in and visit your Account page to see your current points and tier status." },
            { q: "When does my tier reset?", a: "Tiers are based on annual spend and reset every January 1st." },
          ].map(({ q, a }) => (
            <div key={q} className="rounded-xl border border-l-2 border-stroke border-l-emerald-500/40 bg-card p-4 pl-5">
              <p className="text-sm font-semibold text-ink">{q}</p>
              <p className="mt-1.5 text-sm text-ink3">{a}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        {!token && (
          <div className="rounded-2xl border border-stroke bg-raised p-8 text-center">
            <ShieldIcon className="mx-auto mb-3 size-8 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-display text-xl font-bold text-ink">Ready to start earning?</h3>
            <p className="mt-2 text-sm text-ink3">Create a free account and every purchase earns points from day one.</p>
            <Link
              to="/register"
              className="relative mt-5 inline-flex overflow-hidden rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.97]"
            >
              <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
              Create free account
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
