import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useTheme } from "../context/ThemeContext";
import { useDebounce } from "../hooks/useDebounce";
import { queryKeys } from "../lib/queryKeys";
import * as cartService from "../services/cart";
import * as productService from "../services/products";
import * as categoryService from "../services/categories";
import { productImageUrl } from "../lib/productImage";
import { Logo } from "./Logo";
import {
  CartIcon, HeartIcon, MenuIcon, XIcon, UserIcon,
  SunIcon, MoonIcon, SearchIcon, StarIcon,
  ChevronDownIcon, PackageIcon, MapPinIcon, LogoutIcon,
  ChartBarIcon,
} from "./Icons";

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${
    isActive ? "bg-raised text-ink" : "text-ink2 hover:bg-hover hover:text-ink"
  }`;

interface NavbarProps {
  onCartOpen: () => void;
}

/* How many categories to surface in the desktop category bar */
const MAX_NAV_CATEGORIES = 7;

export function Navbar({ onCartOpen }: NavbarProps) {
  const { token, user, logout } = useAuth();
  const { wishlist } = useWishlist();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(searchQuery, 260);

  const isSignedIn = Boolean(token);
  const isAdmin = isSignedIn && user?.roles === "ADMIN";
  const wishlistCount = wishlist.size;

  const { data: suggestions, isFetching: suggestionsFetching } = useQuery({
    queryKey: queryKeys.suggestions(debouncedQuery),
    queryFn: () => productService.getSuggestions(debouncedQuery.trim()),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 30_000,
  });

  const { data: cartData } = useQuery({
    queryKey: queryKeys.cart(),
    queryFn: cartService.getCart,
    enabled: isSignedIn,
    staleTime: 30_000,
  });
  const cartCount = cartData?.items?.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  const { data: categories } = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: categoryService.getCategories,
    staleTime: 5 * 60_000,
  });
  const navCategories = categories?.slice(0, MAX_NAV_CATEGORIES) ?? [];

  /* Active category for the category bar (query-param based, so NavLink can't do it) */
  const activeCategoryId =
    location.pathname === "/products"
      ? new URLSearchParams(location.search).get("category_id")
      : null;
  const onAllProducts = location.pathname === "/products" && !activeCategoryId;

  const dropdownVisible =
    showSuggestions &&
    debouncedQuery.trim().length >= 2 &&
    (suggestionsFetching || (suggestions && suggestions.length > 0));

  function submitSearch(q: string) {
    const trimmed = q.trim();
    setShowSuggestions(false);
    searchInputRef.current?.blur();
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  /* Close popovers on outside click */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setAccountOpen(false);
        return;
      }
      /* "/" focuses the search bar from anywhere (unless already typing) */
      if (e.key === "/") {
        const active = document.activeElement;
        if (
          active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement ||
          active instanceof HTMLSelectElement ||
          (active instanceof HTMLElement && active.isContentEditable)
        ) return;
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const initial = (user?.name?.trim()?.[0] ?? "U").toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stroke bg-page/95 backdrop-blur-md transition-colors">

        {/* ══ Tier 1: logo · search · actions ══════════════════ */}
        <div className="mx-auto flex h-[64px] max-w-7xl items-center gap-3 px-4 sm:px-6 lg:gap-6 lg:px-8">

          <Logo />

          {/* Always-visible search (desktop) */}
          <div ref={searchWrapperRef} className="relative hidden flex-1 md:block md:max-w-xl lg:mx-auto">
            <form
              onSubmit={(e) => { e.preventDefault(); submitSearch(searchQuery); }}
              className="flex h-10 items-center gap-2.5 rounded-full border border-stroke bg-raised/60 pl-4 pr-1.5 transition-all focus-within:border-emerald-500/40 focus-within:bg-card focus-within:shadow-md focus-within:shadow-black/5"
            >
              <SearchIcon className="size-4 shrink-0 text-ink4" />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
                onFocus={() => { if (searchQuery.trim().length >= 2) setShowSuggestions(true); }}
                className="h-full flex-1 bg-transparent text-sm text-ink placeholder:text-ink4 focus:outline-none"
                placeholder="Search products, brands, categories…"
                autoComplete="off"
                role="combobox"
                aria-expanded={dropdownVisible}
                aria-autocomplete="list"
                aria-label="Search products"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setShowSuggestions(false); searchInputRef.current?.focus(); }}
                  className="shrink-0 text-ink4 transition-colors hover:text-ink"
                  aria-label="Clear search"
                >
                  <XIcon className="size-4" />
                </button>
              ) : (
                <kbd className="pointer-events-none hidden shrink-0 select-none rounded border border-stroke bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink4 lg:block">
                  /
                </kbd>
              )}
              <button
                type="submit"
                className="flex h-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-emerald-500"
                aria-label="Search"
              >
                Search
              </button>
            </form>

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
                    <div role="listbox" aria-label="Search suggestions">
                      <div className="px-3 pb-1 pt-2.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">Suggestions</p>
                      </div>
                      {suggestions?.map((p) => {
                        const price = p.discount && p.discount > 0
                          ? p.price * (1 - p.discount / 100)
                          : p.price;
                        return (
                          <button
                            key={p.product_id}
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setShowSuggestions(false);
                              navigate(`/products/${p.product_id}`);
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-raised"
                          >
                            <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-raised">
                              <img src={productImageUrl(p)} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] font-medium text-ink">{p.name}</p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400">
                                  ${price.toFixed(2)}
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
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); submitSearch(searchQuery); }}
                        className="flex w-full items-center gap-2 border-t border-stroke px-3 py-3 text-[12px] font-medium text-ink3 transition-colors hover:bg-raised"
                      >
                        <SearchIcon className="size-3.5 shrink-0 text-ink4" />
                        See all results for &ldquo;{searchQuery}&rdquo;
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop actions */}
          <div className="hidden shrink-0 items-center gap-0.5 md:flex">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex size-9 items-center justify-center rounded-lg text-ink3 transition-colors hover:bg-hover hover:text-ink"
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <SunIcon className="size-[18px]" /> : <MoonIcon className="size-[18px]" />}
            </button>

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

            <button
              type="button"
              onClick={() => (isSignedIn ? onCartOpen() : navigate("/login"))}
              className="relative flex size-9 items-center justify-center rounded-lg text-ink3 transition-colors hover:bg-hover hover:text-ink"
              aria-label="Cart"
            >
              <CartIcon className="size-[18px]" />
              {cartCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex size-[16px] items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>

            {isSignedIn ? (
              /* Account dropdown */
              <div ref={accountRef} className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2 transition-colors ${
                    accountOpen ? "border-edge bg-raised" : "border-stroke hover:border-edge hover:bg-hover"
                  }`}
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <span className="flex size-7 items-center justify-center rounded-full bg-emerald-600 text-[12px] font-bold text-white">
                    {initial}
                  </span>
                  <ChevronDownIcon className={`size-3.5 text-ink4 transition-transform duration-200 ${accountOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ duration: 0.14, ease: [0.25, 0.1, 0.25, 1] }}
                      role="menu"
                      className="absolute right-0 top-[calc(100%+10px)] z-[60] w-64 overflow-hidden rounded-xl border border-stroke bg-card shadow-2xl shadow-black/25"
                    >
                      <div className="border-b border-stroke px-4 py-3">
                        <p className="truncate text-[13px] font-semibold text-ink">{user?.name}</p>
                        <p className="truncate text-[12px] text-ink4">{user?.email}</p>
                      </div>

                      <div className="p-1.5">
                        {[
                          { to: "/account/profile", label: "My account", Icon: UserIcon },
                          { to: "/orders", label: "Orders", Icon: PackageIcon },
                          { to: "/wishlist", label: "Wishlist", Icon: HeartIcon, badge: wishlistCount || undefined },
                          { to: "/account/addresses", label: "Addresses", Icon: MapPinIcon },
                        ].map(({ to, label, Icon, badge }) => (
                          <Link
                            key={to}
                            to={to}
                            role="menuitem"
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink2 transition-colors hover:bg-raised hover:text-ink"
                          >
                            <Icon className="size-4 text-ink4" />
                            {label}
                            {badge != null && (
                              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-raised px-1.5 text-[10px] font-bold text-ink3">
                                {badge}
                              </span>
                            )}
                          </Link>
                        ))}

                        {isAdmin && (
                          <>
                            <div className="mx-3 my-1.5 border-t border-stroke" />
                            <Link
                              to="/admin/products"
                              role="menuitem"
                              onClick={() => setAccountOpen(false)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-ink2 transition-colors hover:bg-raised hover:text-ink"
                            >
                              <ChartBarIcon className="size-4 text-ink4" />
                              Admin dashboard
                              <span className="ml-auto rounded-full bg-emerald-500/12 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                                Admin
                              </span>
                            </Link>
                          </>
                        )}

                        <div className="mx-3 my-1.5 border-t border-stroke" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => { setAccountOpen(false); logout(); }}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium text-red-600 transition-colors hover:bg-red-500/8 dark:text-red-400"
                        >
                          <LogoutIcon className="size-4" />
                          Sign out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className="ml-1 px-3 py-2 text-[14px] font-medium text-ink3 transition-colors hover:text-ink"
                >
                  Sign in
                </NavLink>
                <Link
                  to="/register"
                  className="relative overflow-hidden rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2.5s_infinite] bg-gradient-to-r from-transparent via-white/[0.15] to-transparent" />
                  Get started
                </Link>
              </>
            )}
          </div>

          {/* Mobile controls */}
          <div className="ml-auto flex items-center gap-1 md:hidden">
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
              <button
                type="button"
                onClick={onCartOpen}
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

        {/* ══ Tier 2: category navigation (desktop) ═══════════ */}
        <div className="hidden border-t border-stroke/60 md:block">
          <nav
            className="mx-auto flex h-11 max-w-7xl items-center gap-1 overflow-x-auto px-4 scrollbar-none sm:px-6 lg:px-8"
            aria-label="Category navigation"
          >
            <Link
              to="/products"
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                onAllProducts
                  ? "bg-ink font-semibold text-page"
                  : "font-medium text-ink3 hover:bg-hover hover:text-ink"
              }`}
            >
              All products
            </Link>

            {navCategories.map((cat) => {
              const isActive = activeCategoryId === String(cat.category_id);
              return (
                <Link
                  key={cat.category_id}
                  to={`/products?category_id=${cat.category_id}`}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                    isActive
                      ? "bg-ink font-semibold text-page"
                      : "font-medium text-ink3 hover:bg-hover hover:text-ink"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}

            <NavLink
              to="/deals"
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                  isActive
                    ? "bg-red-500/10 font-semibold text-red-600 dark:text-red-400"
                    : "font-medium text-red-600/90 hover:bg-red-500/8 dark:text-red-400/90"
                }`
              }
            >
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-red-500" />
              </span>
              Deals
            </NavLink>

            <div className="ml-auto flex shrink-0 items-center gap-1 pl-4">
              {[
                { to: "/about", label: "About" },
                { to: "/contact", label: "Contact" },
                { to: "/faq", label: "Help" },
              ].map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `rounded-full px-3 py-1.5 text-[12.5px] transition-colors ${
                      isActive
                        ? "font-semibold text-ink"
                        : "font-medium text-ink4 hover:text-ink"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* ══ Mobile slide-in menu ═══════════════════════════════ */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            className="absolute right-0 top-0 bottom-0 flex w-[300px] flex-col bg-page border-l border-stroke animate-slide-right"
            aria-label="Mobile navigation"
          >
            <div className="flex items-center justify-between border-b border-stroke px-5 py-4">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="flex size-8 items-center justify-center rounded-lg text-ink3 hover:bg-hover"
                aria-label="Close menu"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Signed-in identity */}
            {isSignedIn && (
              <div className="flex items-center gap-3 border-b border-stroke px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[13px] font-bold text-white">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-ink">{user?.name}</p>
                  <p className="truncate text-[11px] text-ink4">{user?.email}</p>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-3 py-4">
              <div className="space-y-0.5">
                <NavLink to="/products" end className={mobileNavClass} onClick={() => setMobileOpen(false)}>Shop all</NavLink>
                <NavLink to="/deals" className={mobileNavClass} onClick={() => setMobileOpen(false)}>
                  Deals
                  <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white">Sale</span>
                </NavLink>
              </div>

              {/* Categories */}
              {navCategories.length > 0 && (
                <>
                  <p className="px-4 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-widest text-ink4">
                    Categories
                  </p>
                  <div className="space-y-0.5">
                    {navCategories.map((cat) => (
                      <Link
                        key={cat.category_id}
                        to={`/products?category_id=${cat.category_id}`}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-[13.5px] font-medium text-ink2 transition-colors hover:bg-hover hover:text-ink"
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </>
              )}

              {isSignedIn && (
                <>
                  <p className="px-4 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-widest text-ink4">
                    My account
                  </p>
                  <div className="space-y-0.5">
                    <NavLink to="/wishlist" className={mobileNavClass} onClick={() => setMobileOpen(false)}>
                      Wishlist
                      {wishlistCount > 0 && (
                        <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                          {wishlistCount}
                        </span>
                      )}
                    </NavLink>
                    <NavLink to="/cart" className={mobileNavClass} onClick={() => setMobileOpen(false)}>
                      Cart
                      {cartCount > 0 && (
                        <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-emerald-500 text-[9px] font-bold text-white">
                          {cartCount}
                        </span>
                      )}
                    </NavLink>
                    <NavLink to="/orders" className={mobileNavClass} onClick={() => setMobileOpen(false)}>Orders</NavLink>
                    <NavLink to="/account/profile" className={mobileNavClass} onClick={() => setMobileOpen(false)}>Profile</NavLink>
                    {isAdmin && <NavLink to="/admin/products" className={mobileNavClass} onClick={() => setMobileOpen(false)}>Admin</NavLink>}
                  </div>
                </>
              )}

              <p className="px-4 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-widest text-ink4">
                Support
              </p>
              <div className="space-y-0.5">
                <NavLink to="/about" className={mobileNavClass} onClick={() => setMobileOpen(false)}>About</NavLink>
                <NavLink to="/contact" className={mobileNavClass} onClick={() => setMobileOpen(false)}>Contact</NavLink>
                <NavLink to="/faq" className={mobileNavClass} onClick={() => setMobileOpen(false)}>FAQ</NavLink>
              </div>
            </div>

            <div className="space-y-2 border-t border-stroke px-4 py-5">
              {isSignedIn ? (
                <button
                  type="button"
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full rounded-lg border border-stroke px-4 py-2.5 text-center text-sm font-medium text-ink2 transition-colors hover:bg-hover"
                >
                  Sign out
                </button>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-lg border border-stroke px-4 py-2.5 text-center text-sm font-medium text-ink2 transition-colors hover:bg-hover"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
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
    </>
  );
}
