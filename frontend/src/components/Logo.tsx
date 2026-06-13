import { Link } from "react-router-dom";

/** Standalone icon mark — forest green bg, mist N, emerald accent bar. */
export function LogoMark({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 52 56" aria-hidden="true">
      <rect width="52" height="52" rx="11" fill="#14532d" />
      <rect x="13" y="12" width="7" height="28" rx="1.5" fill="#f5f7f5" />
      <rect x="32" y="12" width="7" height="28" rx="1.5" fill="#f5f7f5" />
      <polygon points="13,12 20,12 39,40 32,40" fill="#f5f7f5" />
      <rect x="32" y="44" width="20" height="8" rx="4" fill="#22c55e" />
    </svg>
  );
}

type LogoProps = {
  to?: string;
  /** true  = light variant for dark backgrounds (default — site is dark-themed)
   *  false = dark variant for light backgrounds */
  light?: boolean;
  className?: string;
  /** Show icon mark only, no wordmark */
  markOnly?: boolean;
};

export function Logo({
  to = "/",
  light = true,
  markOnly = false,
  className = "",
}: LogoProps) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2.5 ${className}`}
      aria-label="Northline home"
    >
      {light ? (
        /* Light variant — emerald bg icon, dark marks */
        <svg
          viewBox="0 0 52 56"
          className="h-8 w-auto shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5"
          aria-hidden="true"
        >
          <rect width="52" height="52" rx="11" fill="#22c55e" />
          <rect x="13" y="12" width="7" height="28" rx="1.5" fill="#0d1f12" />
          <rect x="32" y="12" width="7" height="28" rx="1.5" fill="#0d1f12" />
          <polygon points="13,12 20,12 39,40 32,40" fill="#0d1f12" />
          <rect x="32" y="44" width="20" height="8" rx="4" fill="#0d1f12" opacity="0.35" />
        </svg>
      ) : (
        /* Dark variant — forest green bg icon, mist marks */
        <svg
          viewBox="0 0 52 56"
          className="h-8 w-auto shrink-0 transition-transform duration-300 group-hover:-translate-y-0.5"
          aria-hidden="true"
        >
          <rect width="52" height="52" rx="11" fill="#14532d" />
          <rect x="13" y="12" width="7" height="28" rx="1.5" fill="#f5f7f5" />
          <rect x="32" y="12" width="7" height="28" rx="1.5" fill="#f5f7f5" />
          <polygon points="13,12 20,12 39,40 32,40" fill="#f5f7f5" />
          <rect x="32" y="44" width="20" height="8" rx="4" fill="#22c55e" />
        </svg>
      )}

      {!markOnly && (
        <span className="font-display text-[17px] font-bold leading-none tracking-[-0.02em]">
          <span className={light ? "text-[#e8f5ee]" : "text-[#14532d]"}>North</span>
          <span className="text-[#22c55e]">line</span>
        </span>
      )}
    </Link>
  );
}
