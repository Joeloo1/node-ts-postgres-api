import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Logo } from "./Logo";
import { useAuth } from "../context/AuthContext";
import { ApiError, apiFetch } from "../lib/api";
import { CheckIcon, MailIcon } from "./Icons";

function FooterNewsletter() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || loading) return;
    setLoading(true);
    try {
      await apiFetch("/api/v1/newsletter/subscribe", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 border-b border-stroke py-10 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-start gap-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-400">
          <MailIcon className="size-5" />
        </div>
        <div>
          <p className="font-display text-[15px] font-semibold text-ink">Get 10% off your first order</p>
          <p className="mt-0.5 text-[13px] text-ink4">New arrivals and members-only deals. No spam, ever.</p>
        </div>
      </div>

      {submitted ? (
        <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-5 py-3 text-[13px] font-medium text-emerald-700 dark:text-emerald-400">
          <CheckIcon className="size-4" />
          You're on the list — welcome aboard!
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-md items-center gap-2 rounded-xl border border-stroke bg-card p-1.5 transition-colors focus-within:border-emerald-500/40"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            aria-label="Email address"
            className="min-w-0 flex-1 bg-transparent px-2.5 text-[14px] text-ink placeholder:text-ink4 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-emerald-500 active:scale-[0.97] disabled:opacity-60"
          >
            {loading ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      )}
    </div>
  );
}

export function Footer() {
  const { token } = useAuth();
  const isSignedIn = Boolean(token);

  return (
    <footer className="mt-24 border-t border-stroke bg-page">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        <FooterNewsletter />

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
              <li><Link to="/deals" className="text-sm text-ink4 transition-colors hover:text-ink">Deals &amp; offers</Link></li>
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
              <li><Link to="/faq" className="text-sm text-ink4 transition-colors hover:text-ink">FAQ</Link></li>
              <li><Link to="/shipping-returns" className="text-sm text-ink4 transition-colors hover:text-ink">Shipping &amp; Returns</Link></li>
              <li><Link to="/terms" className="text-sm text-ink4 transition-colors hover:text-ink">Terms of service</Link></li>
              <li><Link to="/privacy" className="text-sm text-ink4 transition-colors hover:text-ink">Privacy policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-stroke py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12px] text-ink4">
            © {new Date().getFullYear()} Northline, Inc. All rights reserved.
          </p>

          {/* Payment method icons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Visa */}
            <div className="flex h-6 w-10 items-center justify-center overflow-hidden rounded border border-stroke bg-white px-1" title="Visa">
              <svg viewBox="0 0 38 24" className="h-4 w-auto">
                <rect width="38" height="24" rx="3" fill="white"/>
                <path d="M14.016 16.8L15.36 7.2h2.208l-1.344 9.6h-2.208z" fill="#00579F"/>
                <path d="M23.04 7.392c-.432-.168-1.104-.336-1.944-.336-2.136 0-3.648 1.128-3.648 2.736 0 1.2.864 1.848 1.512 2.232.672.384.888.648.888.984 0 .528-.528.768-1.032.768-.672 0-1.056-.096-1.608-.336l-.216-.096-.24 1.464c.408.192 1.152.36 1.92.36 2.256 0 3.72-1.104 3.72-2.808 0-.936-.576-1.656-1.824-2.232-.768-.384-1.224-.624-1.224-.984 0-.336.384-.672 1.224-.672.696 0 1.2.144 1.584.312l.192.096.24-1.488z" fill="#00579F"/>
                <path d="M26.4 7.2h-1.68c-.528 0-.912.144-1.152.672l-3.24 8.928h2.256l.456-1.248h2.76c.048.288.24 1.248.24 1.248H28L26.4 7.2zm-2.64 6.768l.84-2.256c-.024.024.168-.456.288-.744l.144.672.48 2.328h-1.752z" fill="#00579F"/>
                <path d="M11.28 7.2l-2.112 6.528-.228-1.152C8.568 11.04 7.392 9.576 6.096 8.76l1.92 8.04h2.28L13.56 7.2H11.28z" fill="#00579F"/>
                <path d="M7.44 7.2H3.984L3.936 7.392c2.712.672 4.512 2.304 5.256 4.248L8.4 8.016C8.256 7.44 7.896 7.224 7.44 7.2z" fill="#FAA61A"/>
              </svg>
            </div>
            {/* Mastercard */}
            <div className="flex h-6 w-10 items-center justify-center overflow-hidden rounded border border-stroke bg-white px-1" title="Mastercard">
              <svg viewBox="0 0 38 24" className="h-4 w-auto">
                <rect width="38" height="24" rx="3" fill="white"/>
                <circle cx="15" cy="12" r="7" fill="#EB001B"/>
                <circle cx="23" cy="12" r="7" fill="#F79E1B"/>
                <path d="M19 6.8a7 7 0 010 10.4A7 7 0 0119 6.8z" fill="#FF5F00"/>
              </svg>
            </div>
            {/* Amex */}
            <div className="flex h-6 w-10 items-center justify-center overflow-hidden rounded border border-stroke bg-[#016FD0] px-1" title="American Express">
              <svg viewBox="0 0 38 24" className="h-4 w-auto">
                <rect width="38" height="24" rx="3" fill="#016FD0"/>
                <text x="4" y="16" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">AMEX</text>
              </svg>
            </div>
            {/* PayPal */}
            <div className="flex h-6 w-10 items-center justify-center overflow-hidden rounded border border-stroke bg-white px-1.5" title="PayPal">
              <svg viewBox="0 0 101 32" className="h-3.5 w-auto">
                <path d="M12.2 2.5H5.6c-.5 0-.9.3-1 .8L2 19.2c0 .3.2.6.5.6h3.2c.5 0 .9-.3 1-.8l.7-4.4c.1-.5.5-.8 1-.8h2.1c4.4 0 7-2.1 7.6-6.3.3-1.8 0-3.3-.9-4.3-1-1.2-2.7-1.7-5-1.7z" fill="#003087"/>
                <path d="M13.1 8.8c-.4 2.4-2.2 2.4-4 2.4h-1l.7-4.6h.6c1.2 0 2.4 0 3 .7.4.4.5 1 .4 1.8-.1-.1-.1-.1.3-.3z" fill="#009cde"/>
              </svg>
            </div>
            {/* Stripe */}
            <div className="flex h-6 w-10 items-center justify-center overflow-hidden rounded border border-stroke bg-white px-1" title="Stripe">
              <svg viewBox="0 0 60 25" className="h-3 w-auto">
                <path d="M59.6 13.2c0-4.4-2.1-7.9-6.2-7.9-4.1 0-6.6 3.5-6.6 7.8 0 5.2 2.9 7.7 7.1 7.7 2 0 3.6-.5 4.8-1.1v-3.3c-1.2.6-2.5 1-4.2 1-1.7 0-3.1-.6-3.3-2.7h8.3c0-.2.1-.9.1-1.5zm-8.4-1.6c0-2 1.2-2.8 2.3-2.8 1.1 0 2.2.8 2.2 2.8h-4.5zM41.6 5.3c-1.7 0-2.8.8-3.4 1.3l-.2-1h-3.7v20l4.2-1 .1-4.8c.6.4 1.5 1 3 1 3 0 5.8-2.4 5.8-7.8-.1-4.9-2.9-7.7-5.8-7.7zm-1 11.8c-1 0-1.6-.4-2-.8l-.1-6.3c.4-.5 1.1-.8 2.1-.8 1.6 0 2.7 1.8 2.7 4-.1 2.2-1.2 3.9-2.7 3.9zM32.6 4l-4.2 1v3.4l4.2-1V4zm-4.2 1.6v14.7h4.2V5.6l-4.2 1zM23.5 6.6l-.3-1.3h-3.6v14.7h4.2V10c1-1.3 2.7-1.1 3.2-.9V5.3c-.5-.2-2.4-.4-3.5 1.3zm-8.3-5.3l-4.1 1-.1 11.3c0 2.1 1.6 3.6 3.6 3.6 1.1 0 2-.2 2.4-.4v-3.4c-.5.2-2.8.9-2.8-1.2V9.1h2.8V5.6h-2.8l.1-4.3zM4.4 10.3C3 9.7 2.3 9.2 2.3 8.5c0-.6.5-1 1.4-1 1.6 0 3.3.7 4.4 1.3V5.1C7 4.4 5.5 4 3.8 4 1.5 4 0 5.3 0 7.1c0 2.7 1.7 3.9 4.4 5 1.7.6 2.4 1.2 2.4 2 0 .7-.6 1.1-1.6 1.1-1.6 0-3.5-.7-4.9-1.5v3.8c1.3.7 2.9 1.1 4.9 1.1 2.3 0 4.2-1.2 4.2-3.3-.1-2.8-1.8-4-5-4.2z" fill="#635bff"/>
              </svg>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/terms"             className="text-[12px] text-ink4 transition-colors hover:text-ink3">Terms</Link>
            <Link to="/privacy"           className="text-[12px] text-ink4 transition-colors hover:text-ink3">Privacy</Link>
            <Link to="/shipping-returns"  className="text-[12px] text-ink4 transition-colors hover:text-ink3">Shipping</Link>
            <Link to="/contact"           className="text-[12px] text-ink4 transition-colors hover:text-ink3">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
