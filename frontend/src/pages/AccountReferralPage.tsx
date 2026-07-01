import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "../lib/queryKeys";
import * as referralService from "../services/referral";
import { CheckCircleIcon, LinkIcon, UsersIcon, StarIcon } from "../components/Icons";

function ShareButton({ label, href, color }: { label: string; href: string; color: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 ${color}`}
    >
      {label}
    </a>
  );
}

export function AccountReferralPage() {
  const [copied, setCopied] = useState(false);

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.referral(),
    queryFn: referralService.getMyReferral,
  });

  async function copyLink() {
    if (!data?.referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2500);
  }

  if (isPending) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-2xl bg-raised animate-pulse" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-2xl border border-stroke bg-card p-8 text-center">
        <p className="text-sm text-ink3">Could not load referral info. Please refresh.</p>
      </div>
    );
  }

  const referrals = data?.referrals ?? [];
  const referralLink = data?.referralLink ?? "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Refer a friend</h2>
        <p className="mt-1 text-sm text-ink3">
          Share your link and you both earn points when they place their first order.
          You get <strong className="text-ink">200 points</strong>, they get <strong className="text-ink">100 points</strong>.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Referrals sent", value: data.stats.total, icon: UsersIcon, color: "text-blue-500" },
          { label: "Completed", value: data.stats.completed, icon: CheckCircleIcon, color: "text-emerald-500" },
          { label: "Points earned", value: data.stats.pointsEarned.toLocaleString(), icon: StarIcon, color: "text-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-stroke bg-card p-4 text-center">
            <Icon className={`mx-auto mb-2 size-5 ${color}`} />
            <p className="text-xl font-bold tabular-nums text-ink">{value}</p>
            <p className="mt-0.5 text-[11px] text-ink4">{label}</p>
          </div>
        ))}
      </div>

      {/* Referral link */}
      <div className="rounded-2xl border border-stroke bg-card p-5 space-y-4">
        <div>
          <p className="text-sm font-semibold text-ink">Your referral link</p>
          <p className="mt-0.5 text-xs text-ink4">Anyone who signs up with this link is linked to you automatically.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 overflow-hidden rounded-xl border border-stroke bg-input px-4 py-3">
            <p className="truncate font-mono text-sm text-ink">{referralLink}</p>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              copied
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-raised text-ink hover:bg-hover"
            }`}
          >
            {copied ? <CheckCircleIcon className="size-4" /> : <LinkIcon className="size-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <ShareButton
            label="Share on WhatsApp"
            href={`https://wa.me/?text=${encodeURIComponent(`Shop Northline with my link and get 100 bonus points! ${referralLink}`)}`}
            color="bg-[#25D366]"
          />
          <ShareButton
            label="Share on X"
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Get 100 bonus points on your first Northline order!`)}&url=${encodeURIComponent(referralLink)}`}
            color="bg-[#1DA1F2]"
          />
          <a
            href={`mailto:?subject=${encodeURIComponent("Join Northline and get 100 bonus points")}&body=${encodeURIComponent(`Hey! Use my referral link to sign up at Northline and get 100 bonus loyalty points on your first order.\n\n${referralLink}`)}`}
            className="flex items-center justify-center rounded-xl bg-raised px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-hover sm:col-span-1 col-span-2"
          >
            Share via email
          </a>
        </div>
      </div>

      {/* Referral list */}
      {referrals.length > 0 && (
        <div className="rounded-2xl border border-stroke bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-stroke">
            <p className="text-sm font-semibold text-ink">Your referrals</p>
          </div>
          <div className="divide-y divide-stroke">
            {referrals.map((ref) => (
              <div key={ref.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-ink">{ref.referee?.name ?? "Pending signup"}</p>
                  <p className="text-xs text-ink4 mt-0.5">
                    {new Date(ref.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                  ref.status === "COMPLETED"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}>
                  {ref.status === "COMPLETED" ? "Completed" : "Pending"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {referrals.length === 0 && (
        <div className="rounded-2xl border border-dashed border-stroke bg-raised/40 p-8 text-center">
          <UsersIcon className="mx-auto mb-3 size-8 text-ink4" />
          <p className="text-sm font-semibold text-ink">No referrals yet</p>
          <p className="mt-1 text-sm text-ink3">Share your link above to start earning bonus points.</p>
        </div>
      )}
    </motion.div>
  );
}
