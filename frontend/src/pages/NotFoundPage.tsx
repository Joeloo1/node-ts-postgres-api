import { Link, useNavigate } from "react-router-dom";
import { ArrowLeftIcon, SearchIcon } from "../components/Icons";
import { usePageTitle } from "../hooks/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page Not Found");
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[72vh] flex-col items-center justify-center py-16 text-center">
      {/* Large 404 */}
      <div className="relative select-none">
        <p className="font-display text-[10rem] font-bold leading-none tracking-tighter text-zinc-900 sm:text-[14rem]">
          404
        </p>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-20 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 sm:size-24">
            <SearchIcon className="size-9 sm:size-11" />
          </div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">
          Page not found
        </h1>
        <p className="mx-auto max-w-sm text-zinc-500">
          The page you're looking for doesn't exist or may have been moved.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800/80"
        >
          <ArrowLeftIcon className="size-4" />
          Go back
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
        >
          Back to home
        </Link>
        <Link
          to="/products"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition-colors hover:border-zinc-600 hover:bg-zinc-800/80"
        >
          Browse products
        </Link>
      </div>
    </div>
  );
}
