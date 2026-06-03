import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";
import { EyeIcon, EyeOffIcon, ShieldIcon, TruckIcon, PackageIcon } from "../components/Icons";

const features = [
  { icon: ShieldIcon, text: "Secure, encrypted checkout" },
  { icon: TruckIcon, text: "Free shipping on orders over $50" },
  { icon: PackageIcon, text: "Easy 30-day returns" },
];

type Strength = "empty" | "weak" | "fair" | "strong";

function getPasswordStrength(pw: string): Strength {
  if (!pw) return "empty";
  const hasUpper = /[A-Z]/.test(pw);
  const hasNumber = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  if (pw.length < 8) return "weak";
  if (pw.length >= 8 && hasUpper && hasNumber && hasSpecial) return "strong";
  if (pw.length >= 8 && (hasUpper || hasNumber)) return "fair";
  return "weak";
}

const strengthConfig = {
  empty: { label: "", color: "bg-well", width: "w-0", textColor: "" },
  weak: { label: "Weak", color: "bg-red-500", width: "w-1/3", textColor: "text-red-400" },
  fair: { label: "Fair", color: "bg-amber-500", width: "w-2/3", textColor: "text-amber-400" },
  strong: { label: "Strong", color: "bg-emerald-500", width: "w-full", textColor: "text-emerald-400" },
};

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const strength = getPasswordStrength(password);
  const sc = strengthConfig[strength];
  const passwordsMatch = passwordConfirm.length > 0 && password === passwordConfirm;
  const passwordsMismatch = passwordConfirm.length > 0 && password !== passwordConfirm;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== passwordConfirm) {
      setError("Passwords do not match.");
      return;
    }
    setError(null);
    setPending(true);
    try {
      await register({ name, email, password, passwordConfirm, phoneNumber: phoneNumber.trim() || undefined });
      toast.success("Account created! Welcome to Northline.");
      navigate("/", { replace: true });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Registration failed. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-stroke bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15";

  return (
    <div className="flex min-h-[82vh] items-center justify-center py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-stroke bg-card lg:grid-cols-[1fr_1.2fr]">

        {/* Left panel — brand */}
        <div className="relative hidden flex-col justify-between overflow-hidden lg:flex" style={{ background: "linear-gradient(135deg, #064e3b 0%, #065f46 40%, #0f172a 100%)" }}>
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="absolute -left-20 -top-20 size-80 rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 size-64 rounded-full bg-teal-400/10 blur-3xl" />

          <div className="relative px-10 pt-10">
            <Logo light />
          </div>

          <div className="relative space-y-8 px-10 pb-10">
            <div>
              <h2 className="font-display text-[1.85rem] font-bold leading-[1.2] text-white">
                Join thousands of<br />happy shoppers.
              </h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-emerald-100/60">
                Create your free account and start discovering quality products curated for modern living.
              </p>
            </div>

            <ul className="space-y-3">
              {features.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[13px] text-emerald-50/75">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 ring-1 ring-emerald-400/20">
                    <Icon className="size-3.5 text-emerald-300" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            <p className="text-[11px] text-emerald-200/30">
              © {new Date().getFullYear()} Northline. All rights reserved.
            </p>
          </div>
        </div>

        {/* Right panel — form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col justify-center p-8 sm:p-12"
        >
          {/* Mobile brand */}
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <div className="mb-7">
            <h1 className="font-display text-2xl font-bold text-ink">Create your account</h1>
            <p className="mt-1.5 text-sm text-ink4">Free forever. No credit card required.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-900/40 bg-red-950/30 px-4 py-3"
              >
                <p className="text-sm text-red-300">{error}</p>
              </motion.div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink3">Full name</label>
                <input
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Jane Smith"
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-ink3">
                  Phone{" "}<span className="text-ink4 font-normal">(optional)</span>
                </label>
                <input
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={inputClass}
                  placeholder="10–14 digits"
                  autoComplete="tel"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink3">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink3">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink2 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOffIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
                </button>
              </div>
              {/* Strength meter */}
              {password.length > 0 && (
                <div className="space-y-1 pt-0.5">
                  <div className="h-1 w-full rounded-full bg-well overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${sc.color} ${sc.width}`}
                    />
                  </div>
                  <p className={`text-xs ${sc.textColor}`}>{sc.label} password</p>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink3">Confirm password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  minLength={8}
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className={`${inputClass} pr-12 ${
                    passwordsMismatch
                      ? "border-red-600/60 focus:border-red-500/60 focus:ring-red-500/20"
                      : passwordsMatch
                      ? "border-emerald-600/60"
                      : ""
                  }`}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink2 transition-colors"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOffIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
                </button>
              </div>
              {passwordsMismatch && (
                <p className="text-xs text-red-400">Passwords don't match</p>
              )}
              {passwordsMatch && (
                <p className="text-xs text-emerald-400">Passwords match ✓</p>
              )}
            </div>

            <button
              type="submit"
              disabled={pending || passwordsMismatch}
              className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-70"
            >
              {pending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  Creating account…
                </span>
              ) : (
                "Create account"
              )}
            </button>

            <p className="text-center text-xs text-ink4">
              By creating an account you agree to our terms of service.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-ink4">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-emerald-400 hover:text-emerald-300 transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
