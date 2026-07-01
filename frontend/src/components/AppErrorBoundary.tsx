import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** When true the fallback uses a full-page centred layout (top-level use).
   *  When false (default) it renders inline inside the content area. */
  fullPage?: boolean;
};

type State = { error: Error | null };

/**
 * Catches render errors so a single failing page/section does not crash the whole app.
 * Two modes:
 *  - fullPage=true  → centred layout suitable for wrapping the entire <Routes>
 *  - fullPage=false → inline card suitable for wrapping a single route element
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[AppErrorBoundary]", error, info.componentStack);
    }
  }

  render() {
    if (this.state.error) {
      const { fullPage } = this.props;

      const icon = (
        <svg
          className="size-10 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
          />
        </svg>
      );

      const content = (
        <div className="flex flex-col items-center text-center">
          <div className="flex size-20 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/8">
            {icon}
          </div>
          <h2 className="mt-5 font-display text-xl font-bold text-ink">
            Something went wrong
          </h2>
          <p className="mt-2 max-w-sm text-sm text-ink4">
            This page encountered an unexpected error. You can try again or
            return to the home page.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-40 w-full max-w-lg overflow-auto whitespace-pre-wrap rounded-xl border border-stroke bg-raised p-4 text-left font-mono text-[11px] text-red-400">
              {this.state.error.message}
            </pre>
          )}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
            >
              Try again
            </button>
            <a
              href="/"
              className="rounded-xl border border-stroke bg-card px-5 py-2.5 text-sm font-semibold text-ink2 transition-colors hover:bg-raised"
            >
              Go home
            </a>
          </div>
        </div>
      );

      if (fullPage) {
        return (
          <div className="flex min-h-[60vh] items-center justify-center p-8">
            {content}
          </div>
        );
      }

      return (
        <div className="rounded-2xl border border-stroke bg-card p-10">
          {content}
        </div>
      );
    }

    return this.props.children;
  }
}

/** Lightweight wrapper for individual route elements. */
export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return <AppErrorBoundary>{children}</AppErrorBoundary>;
}
