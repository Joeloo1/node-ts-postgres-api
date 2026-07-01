import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { CheckCircleIcon } from "../components/Icons";
import { ApiError } from "../lib/api";
import * as giftCardService from "../services/giftCards";
import type { GiftCardBalance } from "../services/giftCards";

const AMOUNTS = [25, 50, 100, 200, 500];

export function GiftCardsPage() {
  usePageTitle("Gift Cards");
  const [amount, setAmount] = useState<number>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [redeemCode, setRedeemCode] = useState("");
  const [activeTab, setActiveTab] = useState<"buy" | "redeem">("buy");

  const [buying, setBuying] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [balanceResult, setBalanceResult] = useState<GiftCardBalance | null>(null);

  const finalAmount = isCustom ? parseFloat(customAmount) || 0 : amount;

  async function handleBuy(e: React.FormEvent) {
    e.preventDefault();
    if (finalAmount < 10 || finalAmount > 1000) {
      toast.error("Gift card amount must be between $10 and $1000.");
      return;
    }
    setBuying(true);
    try {
      const result = await giftCardService.purchaseGiftCard({
        amount: finalAmount,
        recipientEmail,
        recipientName,
        senderName,
        message,
      });
      toast.success(`Gift card sent! Code: ${result.code}`);
      setRecipientEmail("");
      setRecipientName("");
      setSenderName("");
      setMessage("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to purchase gift card. Please try again.");
    } finally {
      setBuying(false);
    }
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!redeemCode.trim()) return;
    setCheckingBalance(true);
    setBalanceResult(null);
    try {
      const balance = await giftCardService.checkGiftCardBalance(redeemCode.trim());
      setBalanceResult(balance);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error("Gift card not found. Please check the code and try again.");
      } else {
        toast.error(err instanceof ApiError ? err.message : "Could not check balance. Please try again.");
      }
    } finally {
      setCheckingBalance(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Gift Cards — Northline</title>
        <meta name="description" content="Give the gift of choice with a Northline gift card. Available in amounts from $25 to $500." />
        <meta property="og:title" content="Gift Cards — Northline" />
        <meta property="og:description" content="Give the gift of choice with a Northline gift card." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>

      <div className="mx-auto max-w-4xl space-y-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-3"
        >
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Gift Cards</h1>
          <p className="mx-auto max-w-lg text-[15px] leading-relaxed text-ink3">
            The perfect gift for everyone. Send a Northline gift card and let them choose
            exactly what they love.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl border border-stroke bg-raised p-1 mx-auto max-w-xs">
          {(["buy", "redeem"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition-all ${
                activeTab === tab
                  ? "bg-card text-ink shadow-sm"
                  : "text-ink4 hover:text-ink2"
              }`}
            >
              {tab === "buy" ? "Buy a gift card" : "Redeem"}
            </button>
          ))}
        </div>

        {activeTab === "buy" ? (
          <motion.div
            key="buy"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid gap-8 lg:grid-cols-[1.4fr_1fr]"
          >
            <form onSubmit={handleBuy} className="space-y-6">
              {/* Amount selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-ink">Select amount</label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {AMOUNTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => { setAmount(a); setIsCustom(false); }}
                      className={`rounded-xl border py-3 text-sm font-bold transition-all ${
                        !isCustom && amount === a
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "border-stroke bg-card text-ink2 hover:border-edge hover:text-ink"
                      }`}
                    >
                      ${a}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCustom(true)}
                    className={`col-span-3 rounded-xl border py-3 text-sm font-bold transition-all sm:col-span-5 ${
                      isCustom
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "border-stroke bg-card text-ink2 hover:border-edge hover:text-ink"
                    }`}
                  >
                    Custom amount
                  </button>
                </div>
                {isCustom && (
                  <input
                    type="number"
                    min={10}
                    max={1000}
                    step={1}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount ($10–$1000)"
                    className="w-full rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                )}
              </div>

              {/* Recipient */}
              <div className="space-y-4">
                <label className="text-sm font-semibold text-ink">Recipient details</label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Recipient's name"
                    className="rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <input
                    type="email"
                    required
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="Recipient's email"
                    className="rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Your name (From)"
                  className="w-full rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <textarea
                  rows={3}
                  maxLength={300}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Personal message (optional)"
                  className="w-full resize-none rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={buying}
                className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-60"
              >
                {!buying && (
                  <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                )}
                {buying ? (
                  <><div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Processing…</>
                ) : (
                  `Buy gift card — $${finalAmount || "0"}`
                )}
              </button>
            </form>

            {/* Preview card */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-ink">Preview</p>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 to-teal-800 p-6 text-white shadow-2xl shadow-emerald-900/40">
                <div className="absolute -right-12 -top-12 size-48 rounded-full bg-white/5 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 size-40 rounded-full bg-teal-300/10 blur-xl" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold tracking-tight">Northline</div>
                    <svg className="size-8 text-white/40" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm0 2a9 9 0 1 1 0 18A9 9 0 0 1 12 3zm0 2a7 7 0 1 0 0 14A7 7 0 0 0 12 5zm0 2a5 5 0 1 1 0 10A5 5 0 0 1 12 7z"/>
                    </svg>
                  </div>
                  <div className="mt-8">
                    <p className="text-sm text-white/60">Gift Card</p>
                    <p className="mt-1 text-4xl font-bold">${finalAmount || "—"}</p>
                  </div>
                  <div className="mt-6 flex items-end justify-between">
                    <div>
                      {recipientName && <p className="text-sm text-white/80">To: {recipientName}</p>}
                      {senderName && <p className="text-sm text-white/60">From: {senderName}</p>}
                    </div>
                    <p className="text-xs text-white/40">NORTHLINE-XXXX</p>
                  </div>
                </div>
              </div>

              {message && (
                <div className="rounded-xl border border-stroke bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-ink4">Personal message</p>
                  <p className="mt-1.5 text-sm text-ink3">{message}</p>
                </div>
              )}

              {/* Benefits */}
              <div className="rounded-xl border border-stroke bg-card p-4 space-y-2">
                {[
                  "Delivered instantly via email",
                  "Never expires",
                  "Can be used on any order",
                  "Redeemable at checkout",
                ].map((b) => (
                  <div key={b} className="flex items-center gap-2.5 text-sm text-ink3">
                    <CheckCircleIcon className="size-4 shrink-0 text-emerald-500" />
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="redeem"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-md"
          >
            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="rounded-2xl border border-stroke bg-card p-6 space-y-4">
                <div>
                  <label className="text-sm font-semibold text-ink">Gift card code</label>
                  <p className="mt-0.5 text-xs text-ink4">Enter the code from your gift card email.</p>
                </div>
                <input
                  type="text"
                  required
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  placeholder="NORTHLINE-XXXX-XXXX"
                  className="w-full rounded-xl border border-stroke bg-input px-4 py-3 font-mono text-sm uppercase tracking-widest text-ink placeholder:normal-case placeholder:tracking-normal placeholder:text-ink4 focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  type="submit"
                  disabled={checkingBalance}
                  className="relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-60"
                >
                  {!checkingBalance && (
                    <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                  )}
                  {checkingBalance ? (
                    <><div className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Checking…</>
                  ) : "Check balance"}
                </button>

                {balanceResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl border p-4 ${
                      balanceResult.active && balanceResult.balance > 0
                        ? "border-emerald-500/30 bg-emerald-500/8"
                        : "border-red-500/20 bg-red-500/8"
                    }`}
                  >
                    {balanceResult.active && balanceResult.balance > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Valid gift card</p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">${balanceResult.balance.toFixed(2)}</p>
                        </div>
                        <p className="mt-1 text-xs text-ink4">
                          of ${balanceResult.initialValue.toFixed(2)} original value
                          {balanceResult.expiresAt && ` · Expires ${new Date(balanceResult.expiresAt).toLocaleDateString()}`}
                        </p>
                        <p className="mt-2 text-xs text-ink3">Apply this code at checkout to use your balance.</p>
                      </>
                    ) : (
                      <p className="text-sm font-semibold text-red-400">
                        {!balanceResult.active ? "This gift card has been deactivated." : "This gift card has no remaining balance."}
                      </p>
                    )}
                  </motion.div>
                )}
              </div>
              <p className="text-center text-xs text-ink4">
                Enter your code at checkout to apply the balance to your order.
              </p>
            </form>
          </motion.div>
        )}
      </div>
    </>
  );
}
