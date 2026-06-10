import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useTheme } from "../context/ThemeContext";
import { useDebounce } from "../hooks/useDebounce";
import { queryKeys } from "../lib/queryKeys";
import * as cartService from "../services/cart";
import * as productService from "../services/products";
import { productImageUrl } from "../lib/productImage";
import { Logo } from "./Logo";
import {
  CartIcon, HeartIcon, MenuIcon, XIcon, UserIcon,
  SunIcon, MoonIcon, SearchIcon, StarIcon,
} from "./Icons";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative px-3 py-2 text-[14px] transition-colors after:absolute after:bottom-[-18px] after:left-3 after:right-3 after:h-[2px] after:rounded-full after:transition-all ${
    isActive
      ? "font-semibold text-ink after:bg-ink"
      : "font-medium text-ink3 hover:text-ink after:bg-transparent"
  }`;

const mobileNavClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] font-medium transition-colors ${
    isActive ? "bg-raised text-ink" : "text-ink2 hover:bg-hover hover:text-ink"
  }`;

interface NavbarProps {
  onCartOpen: () => void;
}

export function Navbar({ onCartOpen }: NavbarProps) {
  const { token, user, logout } = useAuth();
  const { wishlist } = useWishlist();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
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

  const dropdownVisible =
    showSuggestions &&
    debouncedQuery.trim().length >= 2 &&
    (suggestionsFetching || (suggestions && suggestions.length > 0));

  function submitSearch(q: string) {
    const trimmed = q.trim();
    setSearchOpen(false);
    setSearchQuery("");
    setShowSuggestions(false);
    if (trimmed) navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stroke bg-page/95 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">

          <Logo />

          {!searchOpen && (
            <nav className="hidden md:flex items-center" aria-label="Main navigation">
              <NavLink to="/products" className={navLinkClass}>Shop</NavLink>
              <NavLink
                to="/deals"
                className={({ isActive }) =>
                  `${navLinkClass({ isActive })} flex items-center gap-1.5`
                }
              >
                Deals
                <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">Sale</span>
              </NavLink>
              <NavLink to="/about"    className={navLinkClass}>About</NavLink>
              <NavLink to="/contact"  className={navLinkClass}>Contact</NavLink>
            </nav>
          )}

          {/* Desktop search with autocomplete */}
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
                    onKeyDown={(e) => {
                      if (e.key === "Escape") { setShowSuggestions(false); setSearchOpen(false); setSearchQuery(""); }
                    }}
                    className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink4 focus:outline-none"
                    placeholder="Search products…"
                    autoComplete="off"
                    role="combobox"
                    aria-expanded={dropdownVisible}
                    aria-autocomplete="list"
                    aria-label="Search products"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (searchQuery) { setSearchQuery(""); setShowSuggestions(false); searchInputRef.current?.focus(); }
                      else { setSearchOpen(false); setShowSuggestions(false); }
                    }}
                    className="shrink-0 text-ink4 transition-colors hover:text-ink"
                    aria-label={searchQuery ? "Clear" : "Close search"}
                  >
                    <XIcon className="size-4" />
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
                        <>
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
                                  setSearchOpen(false);
                                  setSearchQuery("");
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
                  onClick={onCartOpen}
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

                {isAdmin && <NavLink to="/admin/products" className={navLinkClass}>Admin</NavLink>}

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
      </header>

      {/* Mobile slide-in menu */}
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
              <NavLink to="/products" className={mobileNavClass} onClick={() => setMobileOpen(false)}>Shop</NavLink>
              <NavLink to="/deals" className={mobileNavClass} onClick={() => setMobileOpen(false)}>
                Deals
                <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-bold text-white">Sale</span>
              </NavLink>
              <NavLink to="/about"    className={mobileNavClass} onClick={() => setMobileOpen(false)}>About</NavLink>
              <NavLink to="/contact"  className={mobileNavClass} onClick={() => setMobileOpen(false)}>Contact</NavLink>

              {isSignedIn && (
                <>
                  <div className="my-2 border-t border-stroke" />
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
                  <NavLink to="/account/profile" className={mobileNavClass} onClick={() => setMobileOpen(false)}>Account</NavLink>
                  {isAdmin && <NavLink to="/admin/products" className={mobileNavClass} onClick={() => setMobileOpen(false)}>Admin</NavLink>}
                </>
              )}
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
