import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";

export function Footer() {
  const { token } = useAuth();
  const isSignedIn = Boolean(token);

  return (
    <footer className="mt-24 border-t border-stroke bg-page">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <div className="grid gap-12 py-14 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">

          <div className="space-y-5">
            <Logo />
            <p className="max-w-[220px] text-[13px] leading-relaxed text-ink4">
              Quality essentials, thoughtfully curated for modern living.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {["Free shipping $50+", "30-day returns", "Secure checkout"].map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-stroke bg-raised px-2.5 py-1 text-[11px] font-medium text-ink4"
                >
                  {badge}
                </span>
              ))}
            </div>
            {/* Social links */}
            <div className="flex items-center gap-3 pt-1">
              {[
                { label: "X / Twitter", href: "https://twitter.com", icon: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
                { label: "Instagram", href: "https://instagram.com", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
              ].map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="flex size-8 items-center justify-center rounded-lg border border-stroke text-ink4 transition-colors hover:border-edge hover:text-ink2"
                >
                  <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d={icon} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-ink3">Shop</p>
            <ul className="mt-4 space-y-3">
              <li><Link to="/products" className="text-sm text-ink4 transition-colors hover:text-ink">All products</Link></li>
              <li><Link to="/products?sortBy=rating&order=desc" className="text-sm text-ink4 transition-colors hover:text-ink">Top rated</Link></li>
              <li><Link to="/products?sortBy=price&order=asc" className="text-sm text-ink4 transition-colors hover:text-ink">Best value</Link></li>
              <li><Link to="/search" className="text-sm text-ink4 transition-colors hover:text-ink">Search</Link></li>
            </ul>
          </div>

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

        <div className="flex flex-col gap-2 border-t border-stroke py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-ink4">
            © {new Date().getFullYear()} Northline, Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link to="/terms"   className="text-[12px] text-ink4 transition-colors hover:text-ink3">Terms</Link>
            <Link to="/privacy" className="text-[12px] text-ink4 transition-colors hover:text-ink3">Privacy</Link>
            <Link to="/contact" className="text-[12px] text-ink4 transition-colors hover:text-ink3">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
