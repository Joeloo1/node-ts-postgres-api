import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      await apiFetch("/api/v1/users/forgetPassword", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
      toast.success("Reset link sent — check your email.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Could not send reset email.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-[72vh] items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-[420px] space-y-8"
      >
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 justify-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-600 font-display text-xl font-bold text-white shadow-lg shadow-emerald-900/30">
              N
            </div>
          </Link>
          <h1 className="mt-5 font-display text-2xl font-bold text-white">Forgot your password?</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-7">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-900/40 text-emerald-400">
                <svg className="size-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">Check your inbox</p>
                <p className="mt-1 text-sm text-zinc-500">
                  We sent a reset link to <span className="text-zinc-300">{email}</span>.
                  The link expires in 10 minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Send to a different email
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-400">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition focus:border-emerald-500/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-70"
              >
                {pending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                    </svg>
                    Sending…
                  </span>
                ) : (
                  "Send reset link"
                )}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-zinc-500">
          Remember it?{" "}
          <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
            Back to sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
