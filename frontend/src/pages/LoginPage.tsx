import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ApiError, apiFetch, setAuthToken } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { Logo } from "../components/Logo";
import { EyeIcon, EyeOffIcon, ShieldIcon, TruckIcon, PackageIcon } from "../components/Icons";
import { usePageTitle } from "../hooks/usePageTitle";

const features = [
  { icon: ShieldIcon, text: "Secure, encrypted checkout" },
  { icon: TruckIcon, text: "Free shipping on orders over $50" },
  { icon: PackageIcon, text: "Easy 30-day returns" },
];

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15";
const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink4";

export function LoginPage() {
  usePageTitle("Sign In");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // 2FA second step
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFACode, setTwoFACode]       = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const res = await apiFetch<{
        status: string;
        accessToken?: string;
        requires2FA?: boolean;
        pendingToken?: string;
      }>("/api/v1/users/Login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (res.requires2FA && res.pendingToken) {
        setPendingToken(res.pendingToken);
        setPending(false);
        return;
      }

      if (res.accessToken) setAuthToken(res.accessToken);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Sign in failed. Please try again.";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  async function onConfirm2FA(e: FormEvent) {
    e.preventDefault();
    if (!pendingToken) return;
    setError(null);
    setPending(true);
    try {
      const res = await apiFetch<{ status: string; accessToken: string }>(
        "/api/v1/users/2fa/confirm",
        { method: "POST", body: JSON.stringify({ pendingToken, code: twoFACode }) },
      );
      setAuthToken(res.accessToken);
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Invalid code. Please try again.";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Sign In — Northline</title>
        <meta name="description" content="Sign in to your Northline account to access your orders, wishlist, and saved addresses." />
        <meta property="og:title" content="Sign In — Northline" />
        <meta property="og:description" content="Sign in to your Northline account." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>
      <div className="flex min-h-[82vh] items-center justify-center py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-stroke bg-card shadow-xl shadow-black/10 lg:grid-cols-[1fr_1.1fr]">

        {/* Left panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden lg:flex" style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #0f172a 100%)" }}>
          <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
          <div className="absolute -left-20 -top-20 size-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 size-64 rounded-full bg-teal-400/10 blur-3xl" />
          <div className="relative px-10 pt-10"><Logo light /></div>
          <div className="relative space-y-8 px-10 pb-10">
            <div>
              <h2 className="font-display text-[1.85rem] font-bold leading-[1.2] text-white">
                Quality goods,<br />waiting for you.
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
            <p className="text-[11px] text-emerald-200/30">© {new Date().getFullYear()} Northline. All rights reserved.</p>
          </div>
        </div>

        {/* Right panel — form */}
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col justify-center px-8 py-12 sm:px-12"
        >
          <div className="mb-8 lg:hidden"><Logo /></div>

          <AnimatePresence mode="wait">
            {pendingToken ? (
              /* ── 2FA step ── */
              <motion.div
                key="2fa"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="mb-8">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-emerald-500/10">
                    <ShieldIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h1 className="font-display text-2xl font-bold text-ink">Two-factor check</h1>
                  <p className="mt-1.5 text-sm text-ink4">Open your authenticator app and enter the 6-digit code.</p>
                </div>

                <form onSubmit={onConfirm2FA} className="space-y-4">
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
                    <label className={labelClass}>Verification code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={twoFACode}
                      onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      autoFocus
                      className={`${inputClass} tracking-[0.4em] text-center font-mono text-lg`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={pending || twoFACode.length !== 6}
                    className="relative w-full overflow-hidden rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-60"
                  >
                    {!pending && twoFACode.length === 6 && (
                      <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                    )}
                    {pending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                        </svg>
                        Verifying…
                      </span>
                    ) : "Verify"}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => { setPendingToken(null); setTwoFACode(""); setError(null); }}
                  className="mt-6 flex items-center gap-1.5 text-[13px] text-ink4 transition-colors hover:text-ink2"
                >
                  ← Back to sign in
                </button>
              </motion.div>
            ) : (
              /* ── Normal login step ── */
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
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
                    <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" />
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center justify-between">
                      <label className={labelClass} style={{ marginBottom: 0 }}>Password</label>
                      <Link to="/forgot-password" className="text-[11px] font-medium text-emerald-500 hover:text-emerald-400 transition-colors">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative mt-1.5">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClass} pr-10`}
                        placeholder="••••••••"
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink2 transition-colors" aria-label={showPassword ? "Hide password" : "Show password"}>
                        {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="size-4 cursor-pointer accent-emerald-600 rounded"
                    />
                    <span className="text-[13px] text-ink4">Remember me for 30 days</span>
                  </label>

                  <button
                    type="submit"
                    disabled={pending}
                    className="relative w-full overflow-hidden rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-60"
                  >
                    {!pending && (
                      <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                    )}
                    {pending ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                        </svg>
                        Signing in…
                      </span>
                    ) : "Sign in"}
                  </button>
                </form>

                {/* Social login */}
                <div className="mt-5">
                  <div className="relative flex items-center gap-3">
                    <div className="h-px flex-1 bg-stroke" />
                    <span className="text-[11px] font-medium text-ink4">or continue with</span>
                    <div className="h-px flex-1 bg-stroke" />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => toast.info("Google sign-in coming soon!")}
                      className="flex items-center justify-center gap-2 rounded-lg border border-stroke bg-card py-2.5 text-[13px] font-medium text-ink2 transition-colors hover:bg-hover hover:text-ink"
                    >
                      <svg className="size-4" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                      </svg>
                      Google
                    </button>
                    <button
                      type="button"
                      onClick={() => toast.info("GitHub sign-in coming soon!")}
                      className="flex items-center justify-center gap-2 rounded-lg border border-stroke bg-card py-2.5 text-[13px] font-medium text-ink2 transition-colors hover:bg-hover hover:text-ink"
                    >
                      <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
                      </svg>
                      GitHub
                    </button>
                  </div>
                </div>

                <p className="mt-6 text-center text-[13px] text-ink4">
                  Don't have an account?{" "}
                  <Link to="/register" className="font-semibold text-emerald-500 hover:text-emerald-400 transition-colors">Create one for free</Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
    </>
  );
}
