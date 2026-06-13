import { useState } from "react";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiFetch } from "../lib/api";

type State = "idle" | "loading" | "success" | "error";

export function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const prefill = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(prefill);
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setState("loading");
    try {
      await apiFetch<{ status: string }>("/api/v1/newsletter/unsubscribe", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <>
      <Helmet>
        <title>Unsubscribe — Northline</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="overflow-hidden rounded-2xl border border-stroke bg-card shadow-lg">
            <div className="px-8 pt-8 pb-6 text-center">
              {state === "success" ? (
                <>
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-500/15">
                    <svg className="size-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h1 className="mt-5 font-display text-xl font-bold text-ink">You're unsubscribed</h1>
                  <p className="mt-2 text-sm text-ink3">
                    <span className="font-medium">{email}</span> has been removed from our marketing emails. You may still receive transactional emails related to your orders.
                  </p>
                  <Link
                    to="/"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                  >
                    Back to Northline
                  </Link>
                </>
              ) : (
                <>
                  <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-raised">
                    <svg className="size-7 text-ink3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <h1 className="mt-5 font-display text-xl font-bold text-ink">Unsubscribe</h1>
                  <p className="mt-2 text-sm text-ink3">
                    Enter your email address and we'll remove you from our newsletter list.
                  </p>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-left">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full rounded-lg border border-stroke bg-input px-4 py-2.5 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15 transition-colors"
                    />

                    {state === "error" && (
                      <p className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-2 text-xs text-red-400">
                        {errorMsg}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={state === "loading" || !email.trim()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-stroke bg-raised py-2.5 text-sm font-medium text-ink transition-colors hover:bg-hover disabled:opacity-50"
                    >
                      {state === "loading" ? (
                        <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                      ) : null}
                      Unsubscribe
                    </button>
                  </form>
                </>
              )}
            </div>

            <div className="border-t border-stroke bg-raised/40 px-8 py-4 text-center">
              <p className="text-xs text-ink4">
                Changed your mind?{" "}
                <Link to="/" className="font-medium text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 transition-colors">
                  Continue shopping
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
