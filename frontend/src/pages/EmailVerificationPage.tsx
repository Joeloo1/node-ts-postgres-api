import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Logo } from "../components/Logo";
import { apiFetch } from "../lib/api";
import { usePageTitle } from "../hooks/usePageTitle";
import { CheckCircleIcon } from "../components/Icons";

type State = "verifying" | "success" | "error";

export function EmailVerificationPage() {
  usePageTitle("Verify Email");
  const [params] = useSearchParams();
  const token = params.get("token");
  const [state, setState] = useState<State>(token ? "verifying" : "error");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setMessage("Verification link is invalid or missing."); return; }
    apiFetch(`/api/v1/users/verifyEmail/${token}`)
      .then(() => setState("success"))
      .catch((err: Error) => {
        setState("error");
        setMessage(err.message ?? "Verification failed. The link may have expired.");
      });
  }, [token]);

  return (
    <div className="flex min-h-[82vh] items-center justify-center py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-md rounded-2xl border border-stroke bg-card p-10 text-center"
      >
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        {state === "verifying" && (
          <div className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center">
              <svg className="size-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Verifying…</h1>
            <p className="text-sm text-ink4">Hang tight while we confirm your email.</p>
          </div>
        )}

        {state === "success" && (
          <div className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircleIcon className="size-8 text-emerald-500" />
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Email verified!</h1>
            <p className="text-sm text-ink4">
              Your email address has been confirmed. You can now access all features.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Go to shop
            </Link>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-4">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-red-500/10">
              <svg className="size-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl font-bold text-ink">Verification failed</h1>
            <p className="text-sm text-ink4">
              {message || "This link is invalid or has expired. Request a new one from your account."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                to="/account/profile"
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                Go to account
              </Link>
              <Link
                to="/"
                className="rounded-xl border border-stroke px-5 py-2.5 text-sm font-semibold text-ink2 transition-colors hover:bg-raised"
              >
                Home
              </Link>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
