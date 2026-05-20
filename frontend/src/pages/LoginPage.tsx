import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Sign in failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-zinc-700/80 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30";

  return (
    <div className="flex min-h-[72vh] items-center justify-center py-12">
      <div className="w-full max-w-[420px] space-y-8">

        {/* Brand mark */}
        <div className="text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-emerald-600 font-display text-2xl font-bold text-white shadow-lg shadow-emerald-900/30">
            N
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Welcome back
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Sign in to your Northline account
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={onSubmit}
          className="space-y-5 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-7"
        >
          {error && (
            <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-400">
              Email address
            </label>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500">
          No account?{" "}
          <Link
            to="/register"
            className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Create one for free
          </Link>
        </p>
      </div>
    </div>
  );
}
