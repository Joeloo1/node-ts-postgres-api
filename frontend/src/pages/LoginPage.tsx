import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { EyeIcon, EyeOffIcon, ShieldIcon, TruckIcon, PackageIcon } from "../components/Icons";

const features = [
  { icon: ShieldIcon, text: "Secure, encrypted checkout" },
  { icon: TruckIcon, text: "Free shipping on orders over $50" },
  { icon: PackageIcon, text: "Easy 30-day returns" },
];

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
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 transition focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

  return (
    <div className="flex min-h-[82vh] items-center justify-center py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-stroke bg-card lg:grid-cols-[1fr_1.1fr]">

        {/* Left panel — brand */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-emerald-950/60 p-10 lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/40 via-transparent to-zinc-900/60" />

          <div className="relative">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500 font-display text-lg font-bold text-white shadow-lg">
                N
              </div>
              <span className="font-display text-lg font-semibold text-white">Northline</span>
            </Link>
          </div>

          <div className="relative space-y-6">
            <div>
              <h2 className="font-display text-3xl font-bold leading-tight text-white">
                Your next favourite<br />purchase is waiting.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-emerald-200/70">
                Sign in to access your orders, wishlist, and a curated shopping experience.
              </p>
            </div>

            <ul className="space-y-3">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-emerald-100/80">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                    <Icon className="size-4 text-emerald-400" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative text-xs text-emerald-200/40">
            © {new Date().getFullYear()} Northline
          </p>
        </div>

        {/* Right panel — form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col justify-center p-8 sm:p-12"
        >
          {/* Mobile brand */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-600 font-display font-bold text-white">N</div>
            <span className="font-display text-base font-semibold text-white">Northline</span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-2xl font-bold text-ink">Welcome back</h1>
            <p className="mt-1.5 text-sm text-ink4">Sign in to your account to continue</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3"
              >
                <p className="text-sm text-red-300">{error}</p>
              </motion.div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink3">Email address</label>
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

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-ink3">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-medium text-emerald-500 hover:text-emerald-400 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink2 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="relative w-full overflow-hidden rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-70"
            >
              {pending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
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

          <p className="mt-8 text-center text-sm text-ink4">
            No account?{" "}
            <Link to="/register" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
              Create one for free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
