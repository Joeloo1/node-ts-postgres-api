import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";

export function OfflinePage() {
  usePageTitle("You're offline");

  return (
    <>
      <Helmet>
        <title>You're offline — Northline</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-raised">
            <svg className="size-9 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">You're offline</h1>
            <p className="mt-2 text-[15px] text-ink3">
              It looks like you lost your internet connection.<br />Check your network and try again.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Try again
            </button>
            <Link
              to="/"
              className="rounded-lg border border-stroke px-6 py-2.5 text-sm font-medium text-ink2 transition-colors hover:bg-hover"
            >
              Go home
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}
