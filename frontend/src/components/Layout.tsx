import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AppErrorBoundary } from "./AppErrorBoundary";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useTheme } from "../context/ThemeContext";
import { apiFetch } from "../lib/api";
import type { Cart, Product } from "../lib/types";
import { Logo } from "./Logo";
import { CartDrawer } from "./CartDrawer";
import { productImageUrl } from "../lib/productImage";
import { useDebounce } from "../hooks/useDebounce";
import {
  CartIcon, HeartIcon, HomeIcon, MenuIcon, XIcon, UserIcon,
  ChevronUpIcon, SunIcon, MoonIcon, SearchIcon, GridIcon, StarIcon,
} from "./Icons";

type CartRes = { status: string; data: { cart: Cart } };

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-2 text-[14px] transition-colors ${
    isActive
      ? "font-semibold text-ink"
      : "font-medium text-ink3 hover:text-ink"
  }`;

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${
    isActive
      ? "bg-raised text-ink"
      : "text-ink2 hover:bg-hover hover:text-ink"
  }`;

export function Layout() {
  const { token, user, logout } = useAuth();
  const { wishlist } = useWishlist();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 260);

  const { data: suggestions, isFetching: suggestionsFetching } = useQuery({
    queryKey: ["nav-search-suggestions", debouncedQuery],
    queryFn: async () => {
      const res = await apiFetch<{ status: string; data: { products: Product[] } }>(
        `/api/v1/products?name=${encodeURIComponent(debouncedQuery.trim())}&limit=6&sortBy=rating&order=desc`,
      );
      return res.data.products;
    },
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const dropdownVisible = showSuggestions && debouncedQuery.trim().length >= 2
    && (suggestionsFetching || (suggestions && suggestions.length > 0));

  function submitSearch(q: string) {
    const trimmed = q.trim();
    setSearchOpen(false);
    setSearchQuery("");
    setShowSuggestions(false);
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSearchOpen(false); setSearchQuery(""); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [searchOpen]);

  const wishlistCount = wishlist.size;
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
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="flex min-h-screen flex-col bg-page">

      {/* ── Header ─────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-stroke bg-page/95 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-[60px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Logo />

          {/* Desktop nav — hidden when search is open */}
          {!searchOpen && (
            <nav className="hidden md:flex items-center" aria-label="Main navigation">
              <NavLink to="/products" className={navLinkClass}>Shop</NavLink>
              <NavLink to="/about" className={navLinkClass}>About</NavLink>
              <NavLink to="/contact" className={navLinkClass}>Contact</NavLink>
            </nav>
          )}

          {/* Desktop search — with autocomplete dropdown */}
          <AnimatePresence>
            {searchOpen && (
              <motion.div
                key="search-wrapper"
                ref={searchWrapperRef}
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="relative hidden flex-1 md:block"
              >
                <form
                  onSubmit={(e) => { e.preventDefault(); submitSearch(searchQuery); }}
                  className="flex items-center gap-2 rounded-xl border border-stroke bg-card px-3 py-2 transition-colors focus-within:border-emerald-500/40"
                >
                  <SearchIcon className="size-4 shrink-0 text-ink4" />
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                    onFocus={() => { if (searchQuery.trim().length >= 2) setShowSuggestions(true); }}
                    onKeyDown={(e) => { if (e.key === "Escape") { setShowSuggestions(false); setSearchOpen(false); setSearchQuery(""); } }}
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink4 focus:outline-none"
                    placeholder="Search products…"
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(""); setShowSuggestions(false); searchInputRef.current?.focus(); }}
                      className="shrink-0 text-ink4 transition-colors hover:text-ink"
                      aria-label="Clear"
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                  {!searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchOpen(false); setShowSuggestions(false); }}
                      className="shrink-0 text-ink4 transition-colors hover:text-ink"
                      aria-label="Close search"
                    >
                      <XIcon className="size-4" />
                    </button>
                  )}
                </form>

                {/* Autocomplete dropdown */}
                <AnimatePresence>
                  {dropdownVisible && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.98 }}
                      transition={{ duration: 0.14, ease: [0.25, 0.1, 0.25, 1] }}
                      className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] overflow-hidden rounded-xl border border-stroke bg-card shadow-2xl shadow-black/25"
                    >
                      {suggestionsFetching && (!suggestions || suggestions.length === 0) ? (
                        <div className="flex items-center gap-2.5 px-4 py-3.5 text-sm text-ink4">
                          <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          Searching…
                        </div>
                      ) : (
                        <>
                          <div className="px-3 pb-1 pt-2.5">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">
                              Suggestions
                            </p>
                          </div>

                          {suggestions?.map((p) => {
                            const displayPrice = p.discount && p.discount > 0
                              ? p.price * (1 - (p.discount as number) / 100)
                              : p.price;
                            return (
                              <button
                                key={p.product_id}
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setSearchOpen(false);
                                  setSearchQuery("");
                                  setShowSuggestions(false);
                                  navigate(`/products/${p.product_id}`);
                                }}
                                className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-raised"
                              >
                                <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-raised">
                                  <img
                                    src={productImageUrl(p)}
                                    alt={p.name}
                                    className="h-full w-full object-cover"
                                    loading="lazy"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                                  <div className="mt-0.5 flex items-center gap-2">
                                    <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      ${displayPrice.toFixed(2)}
                                    </span>
                                    {p.rating != null && (
                                      <span className="flex items-center gap-0.5 text-[11px] text-ink4">
                                        <StarIcon className="size-2.5 text-amber-400" filled />
                                        {p.rating.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}

                          {/* "See all results" footer */}
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); submitSearch(searchQuery); }}
                            className="flex w-full items-center gap-2 border-t border-stroke px-3 py-3 text-[12px] font-medium text-ink3 transition-colors hover:bg-raised"
                          >
                            <SearchIcon className="size-3.5 shrink-0 text-ink4" />
                            See all results for &ldquo;{searchQuery}&rdquo;
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-0.5">
            {/* Search toggle */}
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              className={`flex size-9 items-center justify-center rounded-lg transition-colors ${
                searchOpen ? "bg-raised text-ink" : "text-ink3 hover:bg-hover hover:text-ink"
              }`}
              aria-label="Search"
            >
              <SearchIcon className="size-[18px]" />
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-9 items-center justify-center rounded-lg text-ink3 transition-colors hover:bg-hover hover:text-ink"
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <SunIcon className="size-[18px]" /> : <MoonIcon className="size-[18px]" />}
            </button>

            {isSignedIn ? (
              <>
                {/* Wishlist */}
                <NavLink
                  to="/wishlist"
                  className={({ isActive }) =>
                    `relative flex size-9 items-center justify-center rounded-lg transition-colors ${
                      isActive ? "text-ink" : "text-ink3 hover:text-ink hover:bg-hover"
                    }`
                  }
                  aria-label="Wishlist"
                >
                  <HeartIcon className="size-[18px]" filled={wishlistCount > 0} />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-[16px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                      {wishlistCount > 9 ? "9+" : wishlistCount}
                    </span>
                  )}
                </NavLink>

                {/* Cart — opens drawer */}
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="relative flex size-9 items-center justify-center rounded-lg text-ink3 transition-colors hover:text-ink hover:bg-hover"
                  aria-label="Cart"
                >
                  <CartIcon className="size-[18px]" />
                  {cartCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex size-[16px] items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                      {cartCount > 9 ? "9+" : cartCount}
                    </span>
                  )}
                </button>

                <NavLink to="/orders" className={navLinkClass}>Orders</NavLink>

                <NavLink
                  to="/account/profile"
                  className={({ isActive }) =>
                    `flex size-9 items-center justify-center rounded-lg transition-colors ${
                      isActive ? "text-ink" : "text-ink3 hover:text-ink hover:bg-hover"
                    }`
                  }
                  aria-label="Account"
                >
                  <UserIcon className="size-[18px]" />
                </NavLink>

                {isAdmin && (
                  <NavLink to="/admin/products" className={navLinkClass}>Admin</NavLink>
                )}

                <button
                  type="button"
                  onClick={() => logout()}
                  className="ml-1 px-3 py-2 text-[14px] font-medium text-ink3 transition-colors hover:text-ink"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={navLinkClass}>Sign in</NavLink>
                <Link
                  to="/register"
                  className="ml-1 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-9 items-center justify-center rounded-lg text-ink3 hover:bg-hover"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <SunIcon className="size-[18px]" /> : <MoonIcon className="size-[18px]" />}
            </button>
            <button
              type="button"
              onClick={() => navigate("/search")}
              className="flex size-9 items-center justify-center text-ink3 hover:text-ink"
              aria-label="Search"
            >
              <SearchIcon className="size-[18px]" />
            </button>

            {isSignedIn && (
              <NavLink
                to="/wishlist"
                className="relative flex size-9 items-center justify-center text-ink3 hover:text-ink"
                aria-label="Wishlist"
              >
                <HeartIcon className="size-[18px]" filled={wishlistCount > 0} />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-[16px] items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                )}
              </NavLink>
            )}

            {isSignedIn && (
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="relative flex size-9 items-center justify-center text-ink3 hover:text-ink"
                aria-label="Cart"
              >
                <CartIcon className="size-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex size-[16px] items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex size-9 items-center justify-center rounded-lg text-ink3 hover:bg-hover"
              aria-label="Open menu"
            >
              <MenuIcon className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile menu ─────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            className="absolute right-0 top-0 bottom-0 flex w-[280px] flex-col bg-page border-l border-stroke animate-slide-right"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between border-b border-stroke px-5 py-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-ink3 hover:bg-hover"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
              <NavLink to="/products" className={mobileNavClass}>Shop</NavLink>
              <NavLink to="/about" className={mobileNavClass}>About</NavLink>
              <NavLink to="/contact" className={mobileNavClass}>Contact</NavLink>

              {isSignedIn && (
                <>
                  <div className="my-2 border-t border-stroke" />
                  <NavLink to="/wishlist" className={mobileNavClass}>
                    Wishlist
                    {wishlistCount > 0 && (
                      <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                        {wishlistCount}
                      </span>
                    )}
                  </NavLink>
                  <NavLink to="/cart" className={mobileNavClass}>
                    Cart
                    {cartCount > 0 && (
                      <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
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

            <div className="space-y-2 border-t border-stroke px-4 py-5">
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full rounded-lg border border-stroke px-4 py-2.5 text-center text-sm font-medium text-ink2 transition-colors hover:bg-hover"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block w-full rounded-lg border border-stroke px-4 py-2.5 text-center text-sm font-medium text-ink2 transition-colors hover:bg-hover"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    className="block w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Get started
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      {/* ── Cart drawer ──────────────────────────────────── */}
      {isSignedIn && <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />}

      {/* ── Page content ─────────────────────────────────── */}
      <main className="mx-auto min-h-[50vh] w-full max-w-7xl flex-1 px-4 py-8 pb-20 sm:px-6 md:pb-8 lg:px-8">
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

      {/* ── Back to top ──────────────────────────────────── */}
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

      {/* ── Bottom mobile nav ────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-stroke bg-page/95 px-2 py-2 backdrop-blur-md md:hidden" aria-label="Mobile navigation">
        <NavLink to="/" end className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-ink3"}`}>
          <HomeIcon className="size-5" />
          Home
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-ink3"}`}>
          <GridIcon className="size-5" />
          Shop
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-ink3"}`}>
          <SearchIcon className="size-5" />
          Search
        </NavLink>
        {isSignedIn ? (
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="relative flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium text-ink3"
          >
            <span className="relative">
              <CartIcon className="size-5" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex size-[14px] items-center justify-center rounded-full bg-emerald-500 text-[8px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </span>
            Cart
          </button>
        ) : (
          <NavLink to="/login" className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-ink3"}`}>
            <CartIcon className="size-5" />
            Cart
          </NavLink>
        )}
        <NavLink to={isSignedIn ? "/account/profile" : "/login"} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${isActive ? "text-emerald-600 dark:text-emerald-400" : "text-ink3"}`}>
          <UserIcon className="size-5" />
          Account
        </NavLink>
      </nav>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="mt-24 border-t border-stroke bg-page">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

          {/* Top: brand + links */}
          <div className="grid gap-12 py-14 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">

            {/* Brand column */}
            <div className="space-y-5">
              <Logo />
              <p className="max-w-[220px] text-[13px] leading-relaxed text-ink4">
                Quality essentials, thoughtfully curated for modern living.
              </p>
              {/* Trust badges */}
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  "Free shipping $50+",
                  "30-day returns",
                  "Secure checkout",
                ].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-stroke bg-raised px-2.5 py-1 text-[11px] font-medium text-ink4"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>

            {/* Shop column */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink3">Shop</p>
              <ul className="mt-4 space-y-3">
                <li><Link to="/products" className="text-sm text-ink4 transition-colors hover:text-ink">All products</Link></li>
                <li><Link to="/products?sortBy=rating&order=desc" className="text-sm text-ink4 transition-colors hover:text-ink">Top rated</Link></li>
                <li><Link to="/products?sortBy=price&order=asc" className="text-sm text-ink4 transition-colors hover:text-ink">Best value</Link></li>
                <li><Link to="/search" className="text-sm text-ink4 transition-colors hover:text-ink">Search</Link></li>
              </ul>
            </div>

            {/* Account column */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink3">Account</p>
              <ul className="mt-4 space-y-3">
                {isSignedIn ? (
                  <>
                    <li><Link to="/account/profile" className="text-sm text-ink4 transition-colors hover:text-ink">Profile</Link></li>
                    <li><Link to="/orders" className="text-sm text-ink4 transition-colors hover:text-ink">Orders</Link></li>
                    <li><Link to="/wishlist" className="text-sm text-ink4 transition-colors hover:text-ink">Wishlist</Link></li>
                    <li><Link to="/cart" className="text-sm text-ink4 transition-colors hover:text-ink">Cart</Link></li>
                  </>
                ) : (
                  <>
                    <li><Link to="/login" className="text-sm text-ink4 transition-colors hover:text-ink">Sign in</Link></li>
                    <li><Link to="/register" className="text-sm text-ink4 transition-colors hover:text-ink">Create account</Link></li>
                  </>
                )}
              </ul>
            </div>

            {/* Company column */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-ink3">Company</p>
              <ul className="mt-4 space-y-3">
                <li><Link to="/about" className="text-sm text-ink4 transition-colors hover:text-ink">About</Link></li>
                <li><Link to="/contact" className="text-sm text-ink4 transition-colors hover:text-ink">Contact</Link></li>
                <li><Link to="/terms" className="text-sm text-ink4 transition-colors hover:text-ink">Terms of service</Link></li>
                <li><Link to="/privacy" className="text-sm text-ink4 transition-colors hover:text-ink">Privacy policy</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col gap-2 border-t border-stroke py-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12px] text-ink4">
              © {new Date().getFullYear()} Northline, Inc. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/terms" className="text-[12px] text-ink4 transition-colors hover:text-ink3">Terms</Link>
              <Link to="/privacy" className="text-[12px] text-ink4 transition-colors hover:text-ink3">Privacy</Link>
              <Link to="/contact" className="text-[12px] text-ink4 transition-colors hover:text-ink3">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
