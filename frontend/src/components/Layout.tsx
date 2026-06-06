import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { useAuth } from "../context/AuthContext";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BottomNav } from "./BottomNav";
import { CartDrawer } from "./CartDrawer";
import { ChevronUpIcon } from "./Icons";
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
    <div className="flex min-h-screen flex-col bg-page">
      <a href="#main-content" className="skip-link">Skip to content</a>
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
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16 }}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 flex size-10 items-center justify-center rounded-xl border border-stroke bg-card text-ink3 shadow-lg transition-colors hover:border-edge hover:text-ink"
            aria-label="Back to top"
          >
            <ChevronUpIcon className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <BottomNav onCartOpen={() => setCartOpen(true)} />

      <Footer />

      {/* Screen-reader live region for announcements (cart, toast, etc.) */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" id="sr-announcer" />
    </div>
  );
}
