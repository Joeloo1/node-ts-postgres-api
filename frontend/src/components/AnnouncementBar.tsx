import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const MESSAGES = [
  { text: "Free shipping on all orders over $50", cta: "Shop now →", to: "/products" },
  { text: "New arrivals every week — curated for quality", cta: "See what's new →", to: "/products?sortBy=createdAt&order=desc" },
  { text: "Easy 30-day returns, no questions asked", cta: null, to: null },
];

export function AnnouncementBar() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(() => {
    try { return !sessionStorage.getItem("northline-ann-dismissed"); } catch { return true; }
  });

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % MESSAGES.length);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  if (!visible) return null;

  const msg = MESSAGES[idx];

  return (
    <div className="relative z-50 overflow-hidden bg-emerald-950 px-10 py-2.5 text-center text-[12px] font-medium text-emerald-200">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={idx}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: "easeInOut" }}
          className="inline-flex items-center gap-2"
        >
          {msg.text}
          {msg.cta && msg.to && (
            <Link
              to={msg.to}
              className="font-semibold underline underline-offset-2 decoration-emerald-500/50 hover:decoration-emerald-400 opacity-90 hover:opacity-100 transition-opacity"
            >
              {msg.cta}
            </Link>
          )}
        </motion.span>
      </AnimatePresence>

      {/* Message dots */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-1 flex items-center gap-1">
        {MESSAGES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIdx(i)}
            aria-label={`Message ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${i === idx ? "w-3 h-1 bg-white" : "size-1 bg-white/40"}`}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => { try { sessionStorage.setItem("northline-ann-dismissed", "1"); } catch {} setVisible(false); }}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 flex size-5 items-center justify-center rounded text-white/60 hover:text-white transition-colors"
      >
        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
