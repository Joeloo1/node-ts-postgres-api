import { Link } from "react-router-dom";

/**
 * Northline brand mark — a filled rounded-square with a clean white N inside.
 * Inspired by modern SaaS marks (Linear, Stripe, Notion).
 */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {/* Filled background — inherits currentColor (emerald) */}
      <rect width="32" height="32" rx="8" fill="currentColor" />

      {/* Clean N path in white — left vert, diagonal, right vert */}
      <path
        d="M8.5 23V9L23.5 23V9"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type LogoProps = {
  to?: string;
  /** White variant for dark backgrounds */
  light?: boolean;
  className?: string;
  /** Hide the wordmark — mark only */
  markOnly?: boolean;
};

export function Logo({ to = "/", light = false, markOnly = false, className = "" }: LogoProps) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="Northline home"
    >
      {/* Mark */}
      <span
        className={
          light
            ? "text-emerald-400"
            : "text-emerald-600 transition-colors group-hover:text-emerald-700 dark:text-emerald-500 dark:group-hover:text-emerald-400"
        }
      >
        <LogoMark className="size-[26px]" />
      </span>

      {/* Wordmark */}
      {!markOnly && (
        <span
          className={`font-display text-[15px] font-bold leading-none tracking-[-0.01em] ${
            light ? "text-white" : "text-ink"
          }`}
        >
          Northline
        </span>
      )}
    </Link>
  );
}
