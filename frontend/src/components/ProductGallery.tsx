import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, XIcon, ZoomInIcon } from "./Icons";

const slideVariants = {
  enter:  (d: number) => ({ x: d > 0 ? 32 : -32, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
  exit:   (d: number) => ({ x: d > 0 ? -32 : 32, opacity: 0, transition: { duration: 0.18 } }),
};

export function ProductGallery({ gallery, productName }: { gallery: string[]; productName: string }) {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  function goTo(next: number) {
    setDir(next > idx ? 1 : -1);
    setIdx(next);
  }

  const hasPrev = idx > 0;
  const hasNext = idx < gallery.length - 1;

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      if (e.key === "ArrowLeft"  && idx > 0)                  goTo(idx - 1);
      if (e.key === "ArrowRight" && idx < gallery.length - 1) goTo(idx + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, idx, gallery.length]);

  useEffect(() => {
    document.body.style.overflow = lightbox ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightbox]);

  return (
    <>
      <div className="space-y-3">
        <motion.div
          className="group relative w-full cursor-zoom-in overflow-hidden rounded-xl border border-stroke bg-card"
          drag={gallery.length > 1 ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={(_, info) => {
            if (info.offset.x < -40 && hasNext) goTo(idx + 1);
            if (info.offset.x > 40 && hasPrev) goTo(idx - 1);
          }}
          onClick={() => setLightbox(true)}
          aria-label="View fullscreen"
        >
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.img
              key={idx}
              custom={dir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              src={gallery[idx]}
              alt={`${productName} — image ${idx + 1}`}
              className="aspect-square w-full object-cover"
              draggable={false}
            />
          </AnimatePresence>

          <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 text-[11px] font-medium text-white/80 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            <ZoomInIcon className="size-3.5" />
            Zoom
          </div>

          {gallery.length > 1 && (
            <>
              {hasPrev && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goTo(idx - 1); }}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-lg bg-page/80 text-ink shadow-md backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-page"
                  aria-label="Previous image"
                >
                  <ChevronLeftIcon className="size-5" />
                </button>
              )}
              {hasNext && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); goTo(idx + 1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-lg bg-page/80 text-ink shadow-md backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100 hover:bg-page"
                  aria-label="Next image"
                >
                  <ChevronRightIcon className="size-5" />
                </button>
              )}
              <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-black/50 px-2.5 py-1.5 text-[11px] font-medium text-white/70 backdrop-blur-sm">
                {idx + 1} / {gallery.length}
              </div>
            </>
          )}
        </motion.div>

        {gallery.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {gallery.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                className={`relative shrink-0 overflow-hidden rounded-lg transition-all ${
                  i === idx
                    ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-page opacity-100"
                    : "opacity-50 hover:opacity-80"
                }`}
                aria-label={`View image ${i + 1}`}
              >
                <img src={src} alt="" className="h-[68px] w-[68px] object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/96"
            onClick={() => setLightbox(false)}
          >
            <button
              type="button"
              onClick={() => setLightbox(false)}
              className="absolute right-4 top-4 z-10 flex size-10 items-center justify-center rounded-xl bg-white/10 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Close"
            >
              <XIcon className="size-5" />
            </button>

            {gallery.length > 1 && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/60 backdrop-blur-sm">
                {idx + 1} of {gallery.length}
              </div>
            )}

            {hasPrev && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(idx - 1); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-xl bg-white/10 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Previous"
              >
                <ChevronLeftIcon className="size-6" />
              </button>
            )}

            {hasNext && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); goTo(idx + 1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 flex size-11 items-center justify-center rounded-xl bg-white/10 text-white/70 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Next"
              >
                <ChevronRightIcon className="size-6" />
              </button>
            )}

            <AnimatePresence mode="wait" initial={false} custom={dir}>
              <motion.img
                key={idx}
                custom={dir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                src={gallery[idx]}
                alt={`${productName} — image ${idx + 1}`}
                className="max-h-[88vh] max-w-[88vw] select-none object-contain"
                onClick={(e) => e.stopPropagation()}
                draggable={false}
              />
            </AnimatePresence>

            {gallery.length > 1 && (
              <div className="absolute bottom-6 flex items-center gap-2">
                {gallery.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={(e) => { e.stopPropagation(); goTo(i); }}
                    className={`rounded-full transition-all duration-200 ${
                      i === idx ? "h-1.5 w-5 bg-white" : "size-1.5 bg-white/30 hover:bg-white/60"
                    }`}
                    aria-label={`Image ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
