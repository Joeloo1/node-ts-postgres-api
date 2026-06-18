import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";

const MESSAGES = [
  { text: "🎉 Use code", coupon: "WELCOME10", suffix: "for 10% off your first order", cta: null, to: null },
  { text: "Free shipping on all orders over $50", cta: "Shop now →", to: "/products" },
  { text: "⭐ New arrivals every week — curated for quality", cta: "See what's new →", to: "/new-arrivals" },
  { text: "Easy 30-day returns, no questions asked", cta: "Learn more →", to: "/shipping-returns" },
  { text: "🔥 Limited-time deals — up to 20% off select items", cta: "View deals →", to: "/deals" },
];

export function AnnouncementBar() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(() => {
    try { return !sessionStorage.getItem("northline-ann-dismissed"); } catch { return true; }
  });

  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 4500);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  const msg = MESSAGES[idx];

  function copyCoupon(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    toast.success(`Code "${code}" copied to clipboard!`);
  }

  return (
    <div className="ann-shine relative z-50 overflow-hidden px-10 py-2 text-center text-[12px] font-medium text-emerald-100"
      style={{ background: "linear-gradient(90deg, #022c22 0%, #064e3b 40%, #065f46 60%, #022c22 100%)" }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -7 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="inline-flex items-center gap-2 leading-none"
        >
          <span className="text-emerald-200/80">{msg.text}</span>

          {msg.coupon && (
            <button
              type="button"
              onClick={() => copyCoupon(msg.coupon!)}
              title="Click to copy"
              className="inline-flex items-center gap-1 rounded border border-emerald-400/40 bg-emerald-400/15 px-2 py-0.5 font-mono text-[11px] font-bold tracking-widest text-emerald-300 transition-colors hover:bg-emerald-400/25 active:scale-[0.97]"
            >
              {msg.coupon}
              <svg className="size-2.5 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
              </svg>
            </button>
          )}

          {msg.suffix && <span className="text-emerald-200/70">{msg.suffix}</span>}

          {msg.cta && msg.to && (
            <Link
              to={msg.to}
              className="font-semibold text-emerald-300 underline underline-offset-2 decoration-emerald-500/40 hover:text-white hover:decoration-white/50 transition-colors"
            >
              {msg.cta}
            </Link>
          )}
        </motion.span>
      </AnimatePresence>

      {/* Dots */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-[3px] flex items-center gap-1">
        {MESSAGES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Message ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${i === idx ? "w-3 h-[3px] bg-emerald-300" : "size-[3px] bg-emerald-600"}`}
          />
        ))}
      </div>

      {/* Dismiss */}
      <button
        type="button"
        onClick={() => { try { sessionStorage.setItem("northline-ann-dismissed", "1"); } catch {} setVisible(false); }}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded text-emerald-400/70 hover:text-emerald-200 transition-colors"
      >
        <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
