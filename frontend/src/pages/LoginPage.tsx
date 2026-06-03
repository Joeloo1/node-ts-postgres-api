import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";
import { EyeIcon, EyeOffIcon, ShieldIcon, TruckIcon, PackageIcon } from "../components/Icons";

const features = [
  { icon: ShieldIcon, text: "Secure, encrypted checkout" },
  { icon: TruckIcon, text: "Free shipping on orders over $50" },
  { icon: PackageIcon, text: "Easy 30-day returns" },
];

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15";
const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink4";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Sign in failed. Please try again.";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[82vh] items-center justify-center py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-stroke bg-card shadow-xl shadow-black/10 lg:grid-cols-[1fr_1.1fr]">

        {/* ── Left panel — brand ── */}
        <div className="relative hidden flex-col justify-between overflow-hidden lg:flex" style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #0f172a 100%)" }}>
          {/* Dot-grid texture */}
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* Radial glow */}
          <div className="absolute -left-20 -top-20 size-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 size-64 rounded-full bg-teal-400/10 blur-3xl" />

          {/* Logo */}
          <div className="relative px-10 pt-10">
            <Logo light />
          </div>

          {/* Body */}
          <div className="relative space-y-8 px-10 pb-10">
            <div>
              <h2 className="font-display text-[1.85rem] font-bold leading-[1.2] text-white">
                Your next favourite<br />purchase is waiting.
              </h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-emerald-100/60">
                Sign in to access your orders, wishlist, and a curated shopping experience.
              </p>
            </div>

            <ul className="space-y-3">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[13px] text-emerald-50/75">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 ring-1 ring-emerald-400/20">
                    <Icon className="size-3.5 text-emerald-300" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <p className="text-[11px] text-emerald-200/30">
              © {new Date().getFullYear()} Northline. All rights reserved.
            </p>
          </div>
        </div>

        {/* ── Right panel — form ── */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col justify-center px-8 py-12 sm:px-12"
        >
          {/* Mobile logo */}
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
            <p className="mt-1.5 text-sm text-ink4">Sign in to your account to continue.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-red-500/20 bg-red-500/8 px-4 py-3"
              >
                <p className="text-[13px] text-red-400">{error}</p>
              </motion.div>
            )}

            <div>
              <label className={labelClass}>Email address</label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className={labelClass} style={{ marginBottom: 0 }}>Password</label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink2 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
            >
              {pending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[13px] text-ink4">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-emerald-500 hover:text-emerald-400 transition-colors">
              Create one for free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
