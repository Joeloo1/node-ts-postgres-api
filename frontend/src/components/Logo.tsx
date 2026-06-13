import { Link } from "react-router-dom";

/**
 * Northline brand mark — the "north arrow N".
 * The N's final upstroke ends in an arrowhead pointing north, so the
 * mark literally spells the brand: North (arrow) + line (single stroke).
 * Self-contained gradient so it renders identically on any background.
 */
export function LogoMark({ className = "size-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="nl-mark-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#nl-mark-grad)" />
      <path
        d="M6.5 24V9.5L21.5 24V9.5"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 13.5L21.5 9.5L25.5 13.5"
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
      <LogoMark className="size-[26px] transition-transform duration-300 group-hover:-translate-y-0.5" />

      {!markOnly && (
        <span
          className={`font-display text-[16px] font-bold leading-none tracking-[-0.02em] ${
            light ? "text-white" : "text-ink"
          }`}
        >
          North
          <span className={light ? "text-emerald-300" : "text-emerald-600 dark:text-emerald-400"}>
            line
          </span>
        </span>
      )}
    </Link>
  );
}
