import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { error: Error | null };

/** Catches render errors so a failed page does not leave the main area completely empty. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error("[AppErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="rounded-2xl border border-red-900/50 bg-red-950/30 p-6 text-red-100">
          <h1 className="font-display text-xl font-semibold text-white">This page crashed</h1>
          <p className="mt-2 text-sm text-zinc-300">
            Open the browser console (F12) for the full stack trace.
          </p>
          <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-zinc-950 p-3 font-mono text-xs text-red-200">
            {this.state.error.message}
          </pre>
          <button
            type="button"
            className="mt-4 rounded-lg bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
