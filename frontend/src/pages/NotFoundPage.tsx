import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, SearchIcon } from "../components/Icons";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page Not Found");
  const navigate = useNavigate();

  return (
    <div className="relative flex min-h-[72vh] flex-col items-center justify-center overflow-hidden py-16 text-center">
      {/* atmospheric blobs */}
      <div className="pointer-events-none absolute -top-32 left-1/2 size-[480px] -translate-x-1/2 rounded-full bg-emerald-500/5 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 size-64 rounded-full bg-teal-500/5 blur-3xl" />
      {/* Large 404 */}
      <div className="relative select-none">
        <p className="font-display text-[10rem] font-bold leading-none tracking-tighter text-ink/8 sm:text-[14rem]">
          404
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-24 items-center justify-center rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/15 to-teal-500/10 text-emerald-500 shadow-xl shadow-emerald-500/10 sm:size-28">
            <SearchIcon className="size-12 sm:size-14" />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">
          Page not found
        </h1>
        <p className="mx-auto max-w-sm text-ink4">
          The page you're looking for doesn't exist or may have been moved.
        </p>
      </div>

      <p className="mb-4 text-xs text-ink4">Here are some helpful links instead:</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-card px-5 py-2.5 text-sm font-semibold text-ink2 transition-colors hover:bg-raised hover:text-ink"
        >
          <ArrowLeftIcon className="size-4" />
          Go back
        </button>
        <Link
          to="/"
          className="relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-colors hover:bg-emerald-700 hover:shadow-emerald-500/30 active:scale-[0.98]"
        >
          <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
          Back to home
        </Link>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-card px-5 py-2.5 text-sm font-semibold text-ink2 transition-colors hover:bg-raised hover:text-ink"
        >
          Browse products
        </Link>
      </div>
    </div>
  );
}
