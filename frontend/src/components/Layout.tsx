import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { CartDrawer } from "./CartDrawer";
import { AnnouncementBar } from "./AnnouncementBar";
import { ChevronUpIcon } from "./Icons";
import { CookieConsent } from "./CookieConsent";
import { CompareBar } from "./CompareBar";
import { useEffect } from "react";

export function Layout() {
  const { token } = useAuth();
  const isSignedIn = Boolean(token);
  const location = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-page">
      {/* Ambient depth orbs — dark mode only */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-[-18%] top-[-8%] size-[800px] rounded-full opacity-0 dark:opacity-100 transition-opacity duration-700 bg-emerald-600/[0.042] blur-[160px]" />
        <div className="absolute left-[-12%] top-[38%] size-[600px] rounded-full opacity-0 dark:opacity-100 transition-opacity duration-700 bg-emerald-500/[0.028] blur-[140px]" />
        <div className="absolute bottom-[5%] right-[22%] size-[450px] rounded-full opacity-0 dark:opacity-100 transition-opacity duration-700 bg-teal-400/[0.02] blur-[120px]" />
      </div>

      <a href="#main-content" className="skip-link">Skip to content</a>
      <AnnouncementBar />
      <Navbar onCartOpen={() => setCartOpen(true)} />

      {isSignedIn && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}

      <main id="main-content" className="mx-auto min-h-[50vh] w-full max-w-7xl flex-1 px-4 py-8 pb-20 sm:px-6 md:pb-8 lg:px-8">
        <AppErrorBoundary>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </AppErrorBoundary>
      </main>

      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-20 right-5 z-50 flex size-10 items-center justify-center rounded-xl border border-emerald-500/25 bg-card text-emerald-600 shadow-lg shadow-emerald-500/10 transition-all hover:border-emerald-500/40 hover:bg-emerald-500 hover:text-white hover:shadow-emerald-500/25 active:scale-[0.93] dark:text-emerald-400 md:bottom-6 md:right-6"
            aria-label="Back to top"
          >
            <ChevronUpIcon className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <CompareBar />
      <CookieConsent />
      <BottomNav onCartOpen={() => setCartOpen(true)} />

      <Footer />

      {/* Screen-reader live region for announcements (cart, toast, etc.) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="sr-announcer" />
    </div>
  );
}
