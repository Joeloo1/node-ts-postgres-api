import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { useAuth } from "../context/AuthContext";
import { apiFetch } from "../lib/api";
import type { Cart } from "../lib/types";
import { CartIcon, MenuIcon, XIcon, UserIcon, ChevronUpIcon } from "./Icons";

type CartRes = { status: string; data: { cart: Cart } };

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
    isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
  }`;

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
    isActive ? "bg-zinc-800 text-white" : "text-zinc-300 hover:bg-zinc-800/60 hover:text-white"
  }`;

export function Layout() {
  const { token, user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const isSignedIn = Boolean(token);
  const isAdmin = isSignedIn && String((user as unknown as { roles?: string })?.roles) === "ADMIN";

  const { data: cartData } = useQuery({
    queryKey: ["cart"],
    queryFn: async () => {
      const res = await apiFetch<CartRes>("/api/v1/cart", { auth: true });
      return res.data.cart;
    },
    enabled: isSignedIn,
    staleTime: 30_000,
  });
  const cartCount = cartData?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-zinc-950/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">

          {/* Logo */}
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-sm text-white transition group-hover:bg-emerald-500">
              N
            </div>
            <span className="font-display text-[15px] font-semibold tracking-tight text-white">
              Northline
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="Main navigation">
            <NavLink to="/products" className={navLinkClass}>Shop</NavLink>
            <NavLink to="/about" className={navLinkClass}>About</NavLink>
          </nav>

          {/* Desktop auth */}
          <div className="hidden md:flex items-center gap-1.5">
            {isSignedIn ? (
              <>
                <NavLink
                  to="/cart"
                  className={({ isActive }) =>
                    `relative p-2 rounded-lg transition-colors ${
                      isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                    }`
                  }
                  aria-label="Cart"
                >
                  <CartIcon className="size-5" />
                  {cartCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-[18px] items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/orders" className={navLinkClass}>Orders</NavLink>
                <NavLink
                  to="/account/profile"
                  className={({ isActive }) =>
                    `p-2 rounded-lg transition-colors ${
                      isActive ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                    }`
                  }
                  aria-label="Account"
                >
                  <UserIcon className="size-5" />
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin/products" className={navLinkClass}>Admin</NavLink>
                )}
                <button
                  type="button"
                  onClick={() => logout()}
                  className="px-3 py-2 text-sm font-medium text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>Sign in</NavLink>
                <NavLink
                  to="/register"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  Get started
                </NavLink>
              </>
            )}
          </div>

          {/* Mobile: cart badge + hamburger */}
          <div className="flex items-center gap-1 md:hidden">
            {isSignedIn && (
              <NavLink
                to="/cart"
                className="relative p-2 text-zinc-400 hover:text-white"
                aria-label="Cart"
              >
                <CartIcon className="size-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-[18px] items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </NavLink>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-2 text-zinc-400 hover:text-white rounded-lg"
              aria-label="Open menu"
            >
              <MenuIcon className="size-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            className="absolute right-0 top-0 bottom-0 flex w-72 flex-col bg-zinc-950 border-l border-zinc-800/80 animate-slide-right"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between border-b border-zinc-800/80 px-5 py-4">
              <Link to="/" className="flex items-center gap-2.5">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 font-bold text-xs text-white">N</div>
                <span className="font-display text-sm font-semibold text-white">Northline</span>
              </Link>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-2 text-zinc-400 hover:text-white"
                aria-label="Close menu"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
              <NavLink to="/products" className={mobileNavClass}>Shop</NavLink>
              <NavLink to="/about" className={mobileNavClass}>About</NavLink>
              {isSignedIn && (
                <>
                  <NavLink to="/cart" className={mobileNavClass}>
                    Cart
                    {cartCount > 0 && (
                      <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
                        {cartCount}
                      </span>
                    )}
                  </NavLink>
                  <NavLink to="/orders" className={mobileNavClass}>Orders</NavLink>
                  <NavLink to="/account/profile" className={mobileNavClass}>Account</NavLink>
                  {isAdmin && (
                    <NavLink to="/admin/products" className={mobileNavClass}>Admin</NavLink>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2.5 border-t border-zinc-800/80 px-4 py-5">
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full rounded-xl border border-zinc-700/80 px-4 py-2.5 text-center text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block w-full rounded-xl border border-zinc-700/80 px-4 py-2.5 text-center text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="block w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* Page content */}
      <main className="mx-auto min-h-[50vh] w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <AppErrorBoundary>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </AppErrorBoundary>
      </main>

      {/* Back-to-top */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18 }}
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 z-50 flex size-11 items-center justify-center rounded-full border border-zinc-700/80 bg-zinc-900 text-zinc-300 shadow-xl transition-colors hover:border-emerald-500/50 hover:bg-zinc-800 hover:text-emerald-400"
            aria-label="Back to top"
          >
            <ChevronUpIcon className="size-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-16 border-t border-white/[0.06] bg-zinc-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="group flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 font-bold text-sm text-white">N</div>
                <span className="font-display text-[15px] font-semibold text-white">Northline</span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                Quality essentials, curated for modern living.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Shop</p>
              <ul className="mt-4 space-y-3">
                <li><Link to="/products" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">All products</Link></li>
                <li><Link to="/products?sortBy=rating&order=desc" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Top rated</Link></li>
                <li><Link to="/products?sortBy=price&order=asc" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Best value</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Account</p>
              <ul className="mt-4 space-y-3">
                {isSignedIn ? (
                  <>
                    <li><Link to="/account/profile" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Profile</Link></li>
                    <li><Link to="/orders" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Orders</Link></li>
                    <li><Link to="/cart" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Cart</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/login" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Sign in</Link></li>
                    <li><Link to="/register" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Create account</Link></li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Company</p>
              <ul className="mt-4 space-y-3">
                <li><Link to="/about" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">About</Link></li>
                <li><a href="mailto:support@northline.store" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">Contact</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-zinc-800/60 py-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Northline. All rights reserved.</p>
            <p>Built with React · TypeScript · Prisma</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
