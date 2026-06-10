import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { usePageTitle } from "../hooks/usePageTitle";

export function ForbiddenPage() {
  usePageTitle("Access Denied");
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex min-h-[64vh] flex-col items-center justify-center gap-6 text-center"
    >
      <div className="flex size-20 items-center justify-center rounded-3xl border border-red-900/40 bg-red-950/30">
        <svg className="size-9 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      </div>

      <div>
        <p className="font-mono text-sm font-medium text-red-500">403</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Access denied</h1>
        <p className="mt-3 max-w-sm text-zinc-500">
          You don't have permission to view this page. Admin access is required.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
        >
          Go back
        </button>
        <Link
          to="/"
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          Back to home
        </Link>
      </div>
    </motion.div>
  );
}
