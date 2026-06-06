import { useState } from "react";
import { toast } from "sonner";
import { CheckIcon, ShareIcon } from "./Icons";

export function ShareProduct({ name }: { name: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: name, url }); return; } catch {}
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="flex items-center gap-3 border-t border-stroke pt-5">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex items-center gap-2 rounded-lg border border-stroke px-3.5 py-2 text-xs font-medium text-ink3 transition-colors hover:border-edge hover:text-ink"
      >
        {copied ? <CheckIcon className="size-3.5 text-emerald-500" /> : <ShareIcon className="size-3.5" />}
        {copied ? "Copied!" : "Share"}
      </button>
    </div>
  );
}
