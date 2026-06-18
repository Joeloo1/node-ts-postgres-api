import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Logo } from "../components/Logo";
import { EyeIcon, EyeOffIcon } from "../components/Icons";
import { ApiError, apiFetch } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";

type Strength = "empty" | "weak" | "fair" | "strong";

function getStrength(pw: string): Strength {
  if (!pw) return "empty";
  if (pw.length < 8) return "weak";
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum   = /[0-9]/.test(pw);
  const hasSym   = /[^A-Za-z0-9]/.test(pw);
  if (pw.length >= 8 && hasUpper && hasNum && hasSym) return "strong";
  if (pw.length >= 8 && (hasUpper || hasNum)) return "fair";
  return "weak";
}

const strengthCfg = {
  empty:  { label: "",       color: "bg-well",          width: "w-0",    text: "" },
  weak:   { label: "Weak",   color: "bg-red-500",        width: "w-1/3",  text: "text-red-400" },
  fair:   { label: "Fair",   color: "bg-amber-500",      width: "w-2/3",  text: "text-amber-400" },
  strong: { label: "Strong", color: "bg-emerald-500",    width: "w-full", text: "text-emerald-400" },
};

const inputClass =
  "w-full rounded-xl border border-stroke bg-input px-4 py-3 text-sm text-ink placeholder:text-ink4 transition focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

export function ResetPasswordPage() {
  usePageTitle("Reset Password");
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = getStrength(password);
  const sc = strengthCfg[strength];
  const match    = passwordConfirm.length > 0 && password === passwordConfirm;
  const mismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) { setError("Passwords do not match."); return; }
    if (!token) { setError("Reset token is missing."); return; }
    setError(null);
    setPending(true);
    try {
      await apiFetch(`/api/v1/users/resetPassword/${token}`, {
        method: "PATCH",
        body: JSON.stringify({ password, passwordConfirm }),
      });
      setDone(true);
      toast.success("Password updated successfully!");
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to reset password. The link may have expired.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Helmet>
        <title>Reset Password — Northline</title>
        <meta name="description" content="Set a new password for your Northline account." />
        <meta property="og:title" content="Reset Password — Northline" />
        <meta property="og:description" content="Set a new password for your Northline account." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>
      <div className="flex min-h-[82vh] items-center justify-center py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md rounded-2xl border border-stroke bg-card p-8 sm:p-10"
      >
        <div className="mb-8">
          <Logo />
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 shadow-xl shadow-emerald-500/15">
              <svg className="size-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Password updated</h1>
            <p className="text-sm text-ink4">Redirecting you to sign in…</p>
            <Link to="/login" className="inline-block text-sm font-semibold text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400">
              Sign in now
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-7">
              <h1 className="font-display text-2xl font-bold text-ink">Set new password</h1>
              <p className="mt-1.5 text-sm text-ink4">Choose a strong password for your account.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3"
                >
                  <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink3">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    required minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-12`}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button" tabIndex={-1}
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink2 transition-colors"
                  >
                    {showPw ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="space-y-1 pt-0.5">
                    <div className="h-1 w-full overflow-hidden rounded-full bg-well">
                      <div className={`h-full rounded-full transition-all duration-500 ${sc.color} ${sc.width}`} />
                    </div>
                    {sc.label && <p className={`text-xs ${sc.text}`}>{sc.label} password</p>}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink3">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    required minLength={8}
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className={`${inputClass} pr-12 ${mismatch ? "border-red-600/60" : match ? "border-emerald-600/60" : ""}`}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button
                    type="button" tabIndex={-1}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink2 transition-colors"
                  >
                    {showConfirm ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  </button>
                </div>
                {mismatch && <p className="text-xs text-red-400">Passwords don't match</p>}
                {match && <p className="text-xs text-emerald-400">Passwords match ✓</p>}
              </div>

              <button
                type="submit"
                disabled={pending || mismatch}
                className="relative w-full overflow-hidden rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.98] disabled:opacity-70"
              >
                {!pending && (
                  <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                )}
                {pending ? "Updating…" : "Reset password"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-ink4">
              Remember it?{" "}
              <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 transition-colors">
                Sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
    </>
  );
}
