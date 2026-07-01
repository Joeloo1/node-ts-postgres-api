import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "../lib/queryKeys";
import * as giftCardService from "../services/giftCards";
import { formatPrice } from "../lib/pricing";
import { CreditCardIcon, CheckCircleIcon, LinkIcon } from "../components/Icons";

function statusBadge(card: giftCardService.MyGiftCard) {
  if (!card.active) {
    return <span className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-red-500/10 text-red-500">Revoked</span>;
  }
  if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
    return <span className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">Expired</span>;
  }
  if (card.balance <= 0) {
    return <span className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-ink4/10 text-ink4">Used</span>;
  }
  return <span className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</span>;
}

export function AccountGiftCardsPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: giftCards, isPending, isError } = useQuery({
    queryKey: queryKeys.myGiftCards(),
    queryFn: giftCardService.getMyGiftCards,
  });

  async function copyCode(code: string, id: string) {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success("Gift card code copied!");
    setTimeout(() => setCopiedId(null), 2500);
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

  if (isError) {
    return (
      <div className="rounded-2xl border border-stroke bg-card p-8 text-center">
        <p className="text-sm text-ink3">Could not load gift cards. Please refresh.</p>
      </div>
    );
  }

  const purchased = giftCards.filter((gc) => gc.purchasedBy);
  const received = giftCards.filter((gc) => !gc.purchasedBy);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div>
        <h2 className="font-display text-xl font-bold text-ink">Gift Cards</h2>
        <p className="mt-1 text-sm text-ink3">
          View your purchased and received gift cards. Use the code at checkout to redeem.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total cards", value: giftCards.length, color: "text-blue-500" },
          { label: "Active", value: giftCards.filter((gc) => gc.active && gc.balance > 0 && (!gc.expiresAt || new Date(gc.expiresAt) > new Date())).length, color: "text-emerald-500" },
          { label: "Total balance", value: formatPrice(giftCards.filter((gc) => gc.active).reduce((sum, gc) => sum + gc.balance, 0)), color: "text-amber-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-2xl border border-stroke bg-card p-4 text-center">
            <CreditCardIcon className={`mx-auto mb-2 size-5 ${color}`} />
            <p className="text-xl font-bold tabular-nums text-ink">{value}</p>
            <p className="mt-0.5 text-[11px] text-ink4">{label}</p>
          </div>
        ))}
      </div>

      {giftCards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stroke bg-raised/40 p-8 text-center">
          <CreditCardIcon className="mx-auto mb-3 size-8 text-ink4" />
          <p className="text-sm font-semibold text-ink">No gift cards yet</p>
          <p className="mt-1 text-sm text-ink3">
            Purchase a gift card or receive one from a friend to see it here.
          </p>
        </div>
      ) : (
        <>
          {/* Purchased by me */}
          {purchased.length > 0 && (
            <GiftCardSection title="Purchased by you" cards={purchased} copiedId={copiedId} onCopy={copyCode} />
          )}

          {/* Received */}
          {received.length > 0 && (
            <GiftCardSection title="Received" cards={received} copiedId={copiedId} onCopy={copyCode} />
          )}
        </>
      )}
    </motion.div>
  );
}

function GiftCardSection({
  title,
  cards,
  copiedId,
  onCopy,
}: {
  title: string;
  cards: giftCardService.MyGiftCard[];
  copiedId: string | null;
  onCopy: (code: string, id: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-stroke bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-stroke">
        <p className="text-sm font-semibold text-ink">{title}</p>
      </div>
      <div className="divide-y divide-stroke">
        {cards.map((card) => (
          <div key={card.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm font-semibold text-ink tracking-wide">{card.code}</p>
                {statusBadge(card)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink4">
                <span>
                  Balance: <span className="font-semibold tabular-nums text-ink">{formatPrice(card.balance)}</span>
                  <span className="text-ink4"> / {formatPrice(card.initialBalance)}</span>
                </span>
                {card.expiresAt && (
                  <span>
                    Expires {new Date(card.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
                <span>
                  {new Date(card.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onCopy(card.code, card.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-all ${
                copiedId === card.id
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "border-stroke bg-card text-ink3 hover:bg-raised hover:text-ink"
              }`}
            >
              {copiedId === card.id ? <CheckCircleIcon className="size-3.5" /> : <LinkIcon className="size-3.5" />}
              {copiedId === card.id ? "Copied" : "Copy code"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
