import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register({
        name,
        email,
        password,
        passwordConfirm,
        phoneNumber: phoneNumber.trim() || undefined,
      });
      toast.success("Account created! Welcome to Northline.");
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed";
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
      <div className="w-full max-w-[460px] space-y-8">

        {/* Brand mark */}
        <div className="text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-emerald-600 font-display text-2xl font-bold text-white shadow-lg shadow-emerald-900/30">
            N
          </div>
          <h1 className="font-display text-2xl font-bold text-white">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Join Northline and start shopping today
          </p>
        </div>

        {/* Form card */}
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-7"
        >
          {error && (
            <div className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3">
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-zinc-400">Full name</label>
            <input
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Jane Smith"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">Email address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-400">
              Phone number{" "}
              <span className="font-normal text-zinc-600">(optional)</span>
            </label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={inputClass}
              placeholder="10–14 digits"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium text-zinc-400">Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                placeholder="Min. 8 characters"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-400">Confirm password</label>
              <input
                type="password"
                required
                minLength={8}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                className={inputClass}
                placeholder="Re-enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? "Creating account…" : "Create account"}
          </button>

          <p className="text-center text-xs text-zinc-600">
            By creating an account you agree to our terms of service.
          </p>
        </form>

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
