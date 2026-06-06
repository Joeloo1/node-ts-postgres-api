import { useState } from "react";
import { toast } from "sonner";
import { BellIcon } from "./Icons";

export function BackInStockNotify({ productName }: { productName: string }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
    toast.success(`We'll notify you when ${productName} is back in stock!`);
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
          className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Notify me
        </button>
      </form>
    </div>
  );
}
