import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { EyeIcon, EyeOffIcon } from "../components/Icons";

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink4";

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: "Weak",       color: "bg-red-500" };
  if (s <= 2) return { score: s, label: "Fair",       color: "bg-amber-500" };
  if (s <= 3) return { score: s, label: "Good",       color: "bg-yellow-400" };
  if (s === 4) return { score: s, label: "Strong",    color: "bg-emerald-500" };
  return               { score: s, label: "Very strong", color: "bg-emerald-400" };
}

function PasswordField({
  label, value, onChange, placeholder, required, minLength,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative">
        <input
          required={required}
          minLength={minLength}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-10`}
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink2 transition-colors"
          tabIndex={-1}
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

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  const strength = getStrength(newPassword);
  const passwordsMatch = newPassword.length > 0 && passwordConfirm.length > 0;

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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== passwordConfirm) { toast.error("Passwords do not match"); return; }
    changePassword.mutate();
  }

  return (
    <div className="space-y-5">

      {/* ── Change password ─────────────────────── */}
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

        <form id="security-form" onSubmit={onSubmit} className="space-y-4 border-t border-stroke px-6 py-5">
          {/* Current password */}
          <div className="max-w-sm">
            <PasswordField
              label="Current password"
              value={currentPassword}
              onChange={setCurrentPassword}
              placeholder="Enter your current password"
              required
            />
          </div>

          <div className="border-t border-stroke pt-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <PasswordField
                label="New password"
                value={newPassword}
                onChange={setNewPassword}
                placeholder="Min. 8 characters"
                required
                minLength={8}
              />
              <PasswordField
                label="Confirm new password"
                value={passwordConfirm}
                onChange={setPasswordConfirm}
                placeholder="Repeat new password"
                required
              />
            </div>

            {/* Strength indicator */}
            <AnimatePresence>
              {newPassword.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-3 space-y-1.5"
                >
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
            disabled={changePassword.isPending || (passwordsMatch && newPassword !== passwordConfirm)}
            className="inline-flex items-center gap-2 rounded-lg border border-stroke bg-raised px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-well disabled:opacity-50"
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

      {/* ── Active sessions (informational) ─────── */}
      <motion.section
        custom={1} variants={section} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-ink">Active session</h2>
          <p className="mt-0.5 text-xs text-ink4">
            You are currently signed in on this device.
          </p>
        </div>
        <div className="border-t border-stroke px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-stroke bg-raised">
                <svg className="size-4 text-ink3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-ink">This device</p>
                <p className="text-xs text-ink4">Current session · Web browser</p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              Active now
            </span>
          </div>
        </div>
      </motion.section>

    </div>
  );
}
