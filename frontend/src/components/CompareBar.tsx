import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useCompare } from "../context/CompareContext";
import { productImageUrl } from "../lib/productImage";
import { XIcon } from "./Icons";

export function CompareBar() {
  const { items, remove, clear } = useCompare();

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-0 left-0 right-0 z-40 border-t border-emerald-500/15 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/20"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex flex-1 items-center gap-3 overflow-x-auto">
              <p className="shrink-0 text-xs font-semibold text-ink3">
                Compare ({items.length}/4)
              </p>
              <div className="flex items-center gap-2">
                {items.map((p) => (
                  <div
                    key={p.product_id}
                    className="relative flex shrink-0 items-center gap-2 rounded-lg border border-stroke bg-raised px-2.5 py-1.5"
                  >
                    <img
                      src={productImageUrl(p)}
                      alt={p.name}
                      className="size-8 rounded object-cover"
                    />
                    <span className="max-w-[100px] truncate text-[11px] font-medium text-ink">
                      {p.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => remove(p.product_id)}
                      aria-label={`Remove ${p.name} from comparison`}
                      className="text-ink4 transition-colors hover:text-ink"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={clear}
                className="text-xs font-medium text-ink4 transition-colors hover:text-ink"
              >
                Clear
              </button>
              {items.length >= 2 && (
                <Link
                  to="/compare"
                  className="relative overflow-hidden rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/25 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/35 active:scale-[0.97]"
                >
                  <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                  Compare {items.length} products
                </Link>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
