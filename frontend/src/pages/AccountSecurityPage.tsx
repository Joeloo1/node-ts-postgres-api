import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { CheckIcon, EyeIcon, EyeOffIcon } from "../components/Icons";

type LoginSession = {
  id: string;
  device: string | null;
  browser: string | null;
  os: string | null;
  ipAddress: string | null;
  createdAt: string;
};

function sessionTimeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60)   return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60)   return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)   return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)    return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink4";

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let s = 0;
  if (pw.length >= 8)              s++;
  if (pw.length >= 12)             s++;
  if (/[A-Z]/.test(pw))           s++;
  if (/[0-9]/.test(pw))           s++;
  if (/[^A-Za-z0-9]/.test(pw))   s++;
  if (s <= 1) return { score: s, label: "Weak",        color: "bg-red-500" };
  if (s <= 2) return { score: s, label: "Fair",        color: "bg-amber-500" };
  if (s <= 3) return { score: s, label: "Good",        color: "bg-yellow-400" };
  if (s === 4) return { score: s, label: "Strong",     color: "bg-emerald-500" };
  return               { score: s, label: "Very strong", color: "bg-emerald-400" };
}

function getDeviceInfo(): { name: string; icon: "desktop" | "mobile" } {
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge|OPR/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isEdge = /Edg/.test(ua);
  const browser = isEdge ? "Edge" : isChrome ? "Chrome" : isFirefox ? "Firefox" : isSafari ? "Safari" : "Browser";
  const os = /Windows/.test(ua) ? "Windows" : /Mac/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : "Unknown OS";
  return { name: `${browser} on ${os}`, icon: isMobile ? "mobile" : "desktop" };
}

function PasswordField({
  id, label, value, onChange, placeholder, required, minLength, autoComplete,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; minLength?: number; autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className={labelClass} htmlFor={id}>{label}</label>
      <div className="relative">
        <input
          id={id}
          required={required}
          minLength={minLength}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-10`}
          autoComplete={autoComplete ?? "off"}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 transition-colors hover:text-ink2"
          tabIndex={-1}
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </div>
    </div>
  );
}

const section = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.38, delay: i * 0.08, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

export function AccountSecurityPage() {
  usePageTitle("Security");
  const queryClient = useQueryClient();

  // ── Password form ────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const strength = getStrength(newPassword);
  const passwordsMatch = newPassword.length > 0 && passwordConfirm.length > 0;
  const device = useMemo(() => getDeviceInfo(), []);
  const formIsValid = useMemo(() =>
    currentPassword.length > 0 &&
    newPassword.length >= 8 &&
    newPassword === passwordConfirm &&
    passwordConfirm.length > 0 &&
    /[A-Z]/.test(newPassword) &&
    /[0-9]/.test(newPassword) &&
    /[^A-Za-z0-9]/.test(newPassword),
  [currentPassword, newPassword, passwordConfirm]);

  const requirements = useMemo(() => [
    { label: "At least 8 characters",  met: newPassword.length >= 8 },
    { label: "One uppercase letter",    met: /[A-Z]/.test(newPassword) },
    { label: "One number",             met: /[0-9]/.test(newPassword) },
    { label: "One special character",  met: /[^A-Za-z0-9]/.test(newPassword) },
  ], [newPassword]);

  const changePassword = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/users/updateMyPassword", {
        method: "PATCH", auth: true,
        body: JSON.stringify({ currentPassword, newPassword, passwordConfirm }),
      });
    },
    onSuccess: () => {
      setCurrentPassword(""); setNewPassword(""); setPasswordConfirm("");
      toast.success("Password changed. Please sign in again.");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not change password"),
  });

  // ── Session history ──────────────────────────────────────────────
  const sessionsQuery = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const res = await apiFetch<{ status: string; data: { sessions: LoginSession[] } }>(
        "/api/v1/users/sessions", { auth: true },
      );
      return res.data.sessions;
    },
    staleTime: 60_000,
  });

  // ── 2FA ──────────────────────────────────────────────────────────
  type TwoFAStep = "idle" | "setup" | "disable";
  const [twoFAStep, setTwoFAStep]       = useState<TwoFAStep>("idle");
  const [twoFACode, setTwoFACode]       = useState("");
  const [setupData, setSetupData]       = useState<{ qrCode: string; secret: string } | null>(null);

  const twoFAStatusQuery = useQuery({
    queryKey: ["2fa-status"],
    queryFn: async () => {
      const res = await apiFetch<{ status: string; data: { enabled: boolean } }>(
        "/api/v1/users/2fa/status", { auth: true },
      );
      return res.data.enabled;
    },
    staleTime: 30_000,
  });

  const twoFASetup = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ status: string; data: { qrCode: string; secret: string } }>(
        "/api/v1/users/2fa/setup", { auth: true },
      );
      return res.data;
    },
    onSuccess: (data) => { setSetupData(data); setTwoFAStep("setup"); setTwoFACode(""); },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not start 2FA setup"),
  });

  const twoFAVerify = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/users/2fa/verify", {
        method: "POST", auth: true,
        body: JSON.stringify({ token: twoFACode }),
      });
    },
    onSuccess: () => {
      toast.success("Two-factor authentication enabled.");
      setTwoFAStep("idle"); setTwoFACode(""); setSetupData(null);
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Invalid code — try again"),
  });

  const twoFADisable = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/users/2fa/disable", {
        method: "POST", auth: true,
        body: JSON.stringify({ token: twoFACode }),
      });
    },
    onSuccess: () => {
      toast.success("Two-factor authentication disabled.");
      setTwoFAStep("idle"); setTwoFACode("");
      queryClient.invalidateQueries({ queryKey: ["2fa-status"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Invalid code — try again"),
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== passwordConfirm) { toast.error("Passwords do not match"); return; }
    if (!requirements.every((r) => r.met)) { toast.error("Password does not meet all requirements"); return; }
    changePassword.mutate();
  }

  return (
    <div className="space-y-5">

      {/* Change password */}
      <motion.section
        custom={0} variants={section} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-ink">Change password</h2>
          <p className="mt-0.5 text-xs text-ink4">
            Choose a strong, unique password you don't use elsewhere.
          </p>
        </div>

        <form id="security-form" onSubmit={onSubmit} className="space-y-5 border-t border-stroke px-6 py-5">
          <div className="max-w-sm">
            <PasswordField
              id="currentPassword"
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter your current password"
              required
              autoComplete="current-password"
            />
            <div className="mt-1.5 flex justify-end">
              <a
                href="/forgot-password"
                className="text-[11px] font-medium text-ink4 underline-offset-2 transition-colors hover:text-emerald-600 hover:underline dark:hover:text-emerald-400"
              >
                Forgot your current password?
              </a>
            </div>
          </div>

          <div className="border-t border-stroke pt-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField
                id="newPassword"
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <PasswordField
                id="passwordConfirm"
                label="Confirm new password"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
                placeholder="Repeat new password"
                required
                autoComplete="new-password"
              />
            </div>

            <AnimatePresence>
              {newPassword.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 space-y-3"
                >
                  {/* Strength bar */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4, 5].map((seg) => (
                        <div
                          key={seg}
                          className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                            seg <= strength.score ? strength.color : "bg-stroke"
                          }`}
                        />
                      ))}
                    </div>
                    {strength.label && (
                      <span className={`shrink-0 text-[11px] font-semibold ${
                        strength.score <= 1 ? "text-red-500" :
                        strength.score <= 2 ? "text-amber-500" :
                        strength.score <= 3 ? "text-yellow-400" : "text-emerald-500"
                      }`}>
                        {strength.label}
                      </span>
                    )}
                  </div>

                  {/* Requirements checklist */}
                  <div className="grid grid-cols-2 gap-1">
                    {requirements.map(({ label, met }) => (
                      <div key={label} className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${met ? "text-emerald-600 dark:text-emerald-400" : "text-ink4"}`}>
                        <div className={`flex size-3.5 shrink-0 items-center justify-center rounded-full transition-colors ${met ? "bg-emerald-500/20" : "bg-stroke"}`}>
                          {met && <CheckIcon className="size-2 text-emerald-600 dark:text-emerald-400" />}
                        </div>
                        {label}
                      </div>
                    ))}
                  </div>

                  {passwordsMatch && (
                    <p className={`text-[11px] font-medium ${
                      newPassword === passwordConfirm ? "text-emerald-500" : "text-red-400"
                    }`}>
                      {newPassword === passwordConfirm ? "✓ Passwords match" : "✗ Passwords do not match"}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </form>

        <div className="flex items-center justify-between gap-4 border-t border-stroke bg-well/40 px-6 py-4">
          <p className="text-xs text-ink4">You will be signed out after changing your password.</p>
          <button
            type="submit"
            form="security-form"
            disabled={changePassword.isPending || !formIsValid}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${
              formIsValid
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-stroke bg-raised text-ink hover:bg-well"
            }`}
          >
            {changePassword.isPending && (
              <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {changePassword.isPending ? "Changing…" : "Update password"}
          </button>
        </div>
      </motion.section>

      {/* Session history */}
      <motion.section
        custom={1} variants={section} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-ink">Sign-in history</h2>
          <p className="mt-0.5 text-xs text-ink4">Recent devices that have accessed your account.</p>
        </div>
        <div className="divide-y divide-stroke border-t border-stroke">
          {sessionsQuery.isPending ? (
            /* Skeleton while loading */
            [0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-4">
                <div className="size-10 shrink-0 animate-pulse rounded-xl bg-well" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-32 animate-pulse rounded bg-well" />
                  <div className="h-2.5 w-20 animate-pulse rounded bg-well" />
                </div>
              </div>
            ))
          ) : sessionsQuery.isError || !sessionsQuery.data?.length ? (
            /* Fallback: show current device only */
            <div className="flex items-center justify-between gap-4 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-stroke bg-raised">
                  {device.icon === "mobile" ? (
                    <svg className="size-5 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  ) : (
                    <svg className="size-5 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-ink">{device.name}</p>
                  <p className="text-xs text-ink4">Current session</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                Active
              </span>
            </div>
          ) : (
            sessionsQuery.data.map((s, i) => {
              const isMobile = s.device?.toLowerCase().includes("mobile") || s.device?.toLowerCase().includes("tablet");
              const label = [s.browser, s.os].filter(Boolean).join(" · ") || "Unknown device";
              return (
                <div key={s.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-stroke bg-raised">
                      {isMobile ? (
                        <svg className="size-5 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                        </svg>
                      ) : (
                        <svg className="size-5 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{label}</p>
                      <p className="text-xs text-ink4">
                        {s.ipAddress ?? "Unknown IP"} · {sessionTimeAgo(s.createdAt)}
                      </p>
                    </div>
                  </div>
                  {i === 0 && (
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
                      Current
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </motion.section>

      {/* Two-factor authentication */}
      <motion.section
        custom={2} variants={section} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Two-factor authentication</h2>
            <p className="mt-0.5 text-xs text-ink4">
              Add an extra layer of security with a one-time code on each sign-in.
            </p>
          </div>
          {twoFAStatusQuery.data === true && twoFAStep === "idle" && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Enabled
            </span>
          )}
        </div>

        <div className="border-t border-stroke px-6 py-5">
          {/* Setup step: QR + code entry */}
          <AnimatePresence mode="wait">
            {twoFAStep === "setup" && setupData ? (
              <motion.div
                key="setup"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-5"
              >
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <img
                    src={setupData.qrCode}
                    alt="2FA QR code"
                    className="size-36 shrink-0 rounded-xl border border-stroke bg-white p-1"
                  />
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-ink">Scan with your authenticator app</p>
                      <p className="mt-1 text-xs text-ink4">Use Google Authenticator, Authy, or any TOTP app. Then enter the 6-digit code below.</p>
                    </div>
                    <div className="rounded-lg border border-stroke bg-well/50 px-3 py-2">
                      <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-ink4">Manual entry key</p>
                      <p className="break-all font-mono text-xs text-ink3">{setupData.secret}</p>
                    </div>
                  </div>
                </div>
                <div className="max-w-xs">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink4">Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={`${inputClass} tracking-[0.3em] text-center font-mono`}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setTwoFAStep("idle"); setSetupData(null); setTwoFACode(""); }}
                    className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-ink3 transition-colors hover:bg-raised"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => twoFAVerify.mutate()}
                    disabled={twoFACode.length !== 6 || twoFAVerify.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {twoFAVerify.isPending && (
                      <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    {twoFAVerify.isPending ? "Verifying…" : "Enable 2FA"}
                  </button>
                </div>
              </motion.div>
            ) : twoFAStep === "disable" ? (
              <motion.div
                key="disable"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                <p className="text-sm text-ink3">Enter your current authenticator code to disable 2FA.</p>
                <div className="max-w-xs">
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink4">Verification code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={`${inputClass} tracking-[0.3em] text-center font-mono`}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setTwoFAStep("idle"); setTwoFACode(""); }}
                    className="rounded-lg border border-stroke px-4 py-2 text-sm font-medium text-ink3 transition-colors hover:bg-raised"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => twoFADisable.mutate()}
                    disabled={twoFACode.length !== 6 || twoFADisable.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/8 px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-500/15 disabled:opacity-50 dark:text-red-400"
                  >
                    {twoFADisable.isPending ? "Disabling…" : "Disable 2FA"}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl border ${twoFAStatusQuery.data ? "border-emerald-500/20 bg-emerald-500/8" : "border-stroke bg-raised"}`}>
                    <svg className={`size-4 ${twoFAStatusQuery.data ? "text-emerald-600 dark:text-emerald-400" : "text-ink4"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">Authenticator app</p>
                    <p className="mt-0.5 text-xs text-ink4">
                      {twoFAStatusQuery.data
                        ? "Your account is protected with TOTP."
                        : "Use Google Authenticator, Authy, or any TOTP app."}
                    </p>
                  </div>
                </div>
                {twoFAStatusQuery.isPending ? (
                  <div className="h-8 w-20 animate-pulse rounded-lg bg-well" />
                ) : twoFAStatusQuery.data ? (
                  <button
                    type="button"
                    onClick={() => { setTwoFAStep("disable"); setTwoFACode(""); }}
                    className="rounded-lg border border-red-500/20 bg-red-500/8 px-3.5 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-500/15 dark:text-red-400"
                  >
                    Disable
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => twoFASetup.mutate()}
                    disabled={twoFASetup.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {twoFASetup.isPending && (
                      <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                    )}
                    {twoFASetup.isPending ? "Loading…" : "Enable 2FA"}
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

    </div>
  );
}
