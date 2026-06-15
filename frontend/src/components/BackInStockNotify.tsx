import { useState } from "react";
import { toast } from "sonner";
import { BellIcon } from "./Icons";
import { ApiError, apiFetch } from "../lib/api";

export function BackInStockNotify({ productId, productName }: { productId: string; productName: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await apiFetch("/api/v1/stock-notify", {
        method: "POST",
        body: JSON.stringify({ email, product_id: productId }),
      });
      setSubmitted(true);
      toast.success(`We'll notify you when ${productName} is back in stock!`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3">
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
          ✓ We'll notify you when this is back in stock.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-stroke bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <BellIcon className="size-4 text-amber-500" />
        <p className="text-sm font-semibold text-ink">Notify me when back in stock</p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="flex-1 rounded-lg border border-stroke bg-input px-3 py-2 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
        />
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "…" : "Notify me"}
        </button>
      </form>
    </div>
  );
}
