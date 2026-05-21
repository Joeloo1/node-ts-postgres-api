import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AccountProfileSkeleton } from "../components/ProductSkeleton";
import { EyeIcon, EyeOffIcon, LockClosedIcon, PencilIcon, UserIcon } from "../components/Icons";
import type { User } from "../lib/types";

const inputClass =
  "w-full rounded-xl border border-stroke bg-input px-4 py-2.5 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-colors";
const labelClass = "mb-1.5 block text-xs font-medium text-ink3";

function getProfileImageUrl(image?: string): string | null {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
  return `${base}/public/users/${image}`;
}

function safeUserFields(user: User) {
  const u = user as Record<string, unknown>;
  return {
    id: String(u.id ?? ""),
    name: String(u.name ?? ""),
    email: String(u.email ?? ""),
    roles: u.roles != null ? String(u.roles as string | object) : "—",
    phoneNumber: u.phoneNumber != null ? String(u.phoneNumber) : null,
    profileImage: u.profileImage != null ? String(u.profileImage) : undefined,
  };
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
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 hover:text-ink3 transition-colors"
          tabIndex={-1}
        >
          {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
        </button>
      </div>
    </div>
  );
}

const card = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.38, delay: i * 0.09, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

export function AccountProfilePage() {
  usePageTitle("Profile");
  const { user, isLoading: profileLoading, profileError } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const safe = useMemo(() => (user ? safeUserFields(user as User) : null), [user]);

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    if (!safe) return;
    setProfileName(safe.name ?? "");
    setProfileEmail(safe.email ?? "");
    setProfilePhone(safe.phoneNumber ?? "");
  }, [safe?.id, safe?.name, safe?.email, safe?.phoneNumber]);

  function handleImageFile(file: File | null) {
    setProfileImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  }

  const updateProfile = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      if (profileName.trim()) payload.name = profileName.trim();
      if (profileEmail.trim()) payload.email = profileEmail.trim();
      if (profilePhone.trim()) payload.phoneNumber = profilePhone.trim();
      if (profileImageFile) {
        const body = new FormData();
        if (payload.name) body.append("name", payload.name);
        if (payload.email) body.append("email", payload.email);
        if (payload.phoneNumber) body.append("phoneNumber", payload.phoneNumber);
        body.append("profileImage", profileImageFile);
        await apiFetch("/api/v1/users/updateMe", { method: "PATCH", auth: true, body });
        return;
      }
      await apiFetch("/api/v1/users/updateMe", { method: "PATCH", auth: true, body: JSON.stringify(payload) });
    },
    onSuccess: async () => {
      setProfileImageFile(null);
      setImagePreview(null);
      toast.success("Profile updated.");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not update profile"),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/users/updateMyPassword", {
        method: "PATCH", auth: true,
        body: JSON.stringify({ currentPassword, newPassword, passwordConfirm }),
      });
    },
    onSuccess: () => {
      setCurrentPassword(""); setNewPassword(""); setPasswordConfirm("");
      toast.success("Password changed. Please log in again.");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not change password"),
  });

  function onUpdateProfile(e: FormEvent) { e.preventDefault(); updateProfile.mutate(); }
  function onChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== passwordConfirm) { toast.error("New passwords do not match"); return; }
    changePassword.mutate();
  }

  if (profileError) return (
    <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6">
      <p className="text-sm text-amber-700 dark:text-amber-200">{profileError}</p>
      <p className="mt-2 text-sm text-ink3">Try signing out and back in.</p>
    </section>
  );

  if (profileLoading) return <AccountProfileSkeleton />;

  if (!safe) return (
    <section className="rounded-2xl border border-stroke bg-card p-6">
      <p className="text-sm text-ink3">No profile data. Try refreshing or signing back in.</p>
    </section>
  );

  const displayImage = imagePreview ?? getProfileImageUrl(safe.profileImage);

  return (
    <div className="space-y-5">
      {/* ── Edit Profile ─────────────────────────── */}
      <motion.section custom={0} variants={card} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="flex items-center gap-3 border-b border-stroke px-6 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
            <UserIcon className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">Edit Profile</h2>
            <p className="text-xs text-ink3">Update your personal information</p>
          </div>
        </div>

        <form onSubmit={onUpdateProfile} className="p-6 space-y-5">
          {/* Avatar with persistent edit badge */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <motion.button
                type="button"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => fileInputRef.current?.click()}
                className="relative block"
                aria-label="Change profile photo"
              >
                {displayImage ? (
                  <img src={displayImage} alt="Profile"
                    className="size-20 rounded-full border-2 border-stroke object-cover"
                  />
                ) : (
                  <div className="flex size-20 items-center justify-center rounded-full border-2 border-stroke bg-gradient-to-br from-emerald-500 to-teal-600 text-xl font-bold text-white">
                    {safe.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </motion.button>

              {/* Always-visible edit badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-page bg-emerald-600 text-white shadow-md transition-colors hover:bg-emerald-500"
                aria-label="Edit photo"
              >
                <PencilIcon className="size-3" />
              </button>
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">Profile photo</p>
              <p className="text-xs text-ink3">JPG or PNG, resized to 500 × 500</p>
              {profileImageFile ? (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-xs text-emerald-600 font-medium truncate max-w-[140px]">{profileImageFile.name}</span>
                  <button type="button" onClick={() => handleImageFile(null)}
                    className="text-xs text-ink3 hover:text-ink transition-colors"
                  >Remove</button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="mt-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-500 transition-colors"
                >
                  Choose photo
                </button>
              )}
            </div>

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Full name</label>
              <input required minLength={2} placeholder="Your name" value={profileName}
                onChange={(e) => setProfileName(e.target.value)} className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email address</label>
              <input required type="email" placeholder="you@example.com" value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)} className={inputClass}
              />
            </div>
          </div>

          <div className="sm:w-1/2">
            <label className={labelClass}>Phone <span className="text-ink4">(optional)</span></label>
            <input placeholder="+1 555 000 0000" value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)} className={inputClass}
            />
          </div>

          <div className="pt-1">
            <button type="submit" disabled={updateProfile.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {updateProfile.isPending && (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {updateProfile.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </motion.section>

      {/* ── Security ─────────────────────────────── */}
      <motion.section custom={1} variants={card} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="flex items-center gap-3 border-b border-stroke px-6 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-raised text-ink3">
            <LockClosedIcon className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">Security</h2>
            <p className="text-xs text-ink3">Change your account password</p>
          </div>
        </div>

        <form onSubmit={onChangePassword} className="p-6 space-y-4">
          <PasswordField label="Current password" value={currentPassword} onChange={setCurrentPassword}
            placeholder="Enter current password" required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField label="New password" value={newPassword} onChange={setNewPassword}
              placeholder="Min 8 characters" required minLength={8}
            />
            <PasswordField label="Confirm new password" value={passwordConfirm} onChange={setPasswordConfirm}
              placeholder="Repeat new password" required
            />
          </div>

          {newPassword && passwordConfirm && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className={`text-xs font-medium ${newPassword === passwordConfirm ? "text-emerald-600" : "text-red-500"}`}
            >
              {newPassword === passwordConfirm ? "✓ Passwords match" : "✗ Passwords do not match"}
            </motion.p>
          )}

          <div className="pt-1">
            <button type="submit"
              disabled={changePassword.isPending || (!!passwordConfirm && newPassword !== passwordConfirm)}
              className="inline-flex items-center gap-2 rounded-xl border border-stroke bg-raised px-5 py-2.5 text-sm font-semibold text-ink transition-all hover:bg-well disabled:opacity-50"
            >
              {changePassword.isPending && (
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              )}
              {changePassword.isPending ? "Changing…" : "Change password"}
            </button>
          </div>
        </form>
      </motion.section>
    </div>
  );
}
