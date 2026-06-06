import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AccountProfileSkeleton } from "../components/ProductSkeleton";
import { CameraIcon, ShieldIcon } from "../components/Icons";
import { ConfirmButton } from "../components/ConfirmButton";
import type { User } from "../lib/types";

const inputClass =
  "w-full rounded-lg border border-stroke bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink4 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/15";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink4";

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
    isVerified: Boolean(u.isVerified),
  };
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-stroke bg-well/40 px-6 py-4">
      {children}
    </div>
  );
}

const section = {
  hidden: { opacity: 0, y: 16 },
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
  const [avatarError, setAvatarError] = useState(false);

  const safe = useMemo(() => (user ? safeUserFields(user as User) : null), [user]);

  const [profileName, setProfileName]   = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview]          = useState<string | null>(null);

  useEffect(() => {
    if (!safe) return;
    setProfileName(safe.name ?? "");
    setProfileEmail(safe.email ?? "");
    setProfilePhone(safe.phoneNumber ?? "");
  }, [safe?.id]);

  function handleImageFile(file: File | null) {
    setProfileImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
    if (file) setAvatarError(false);
  }

  const updateProfile = useMutation({
    mutationFn: async () => {
      const payload: Record<string, string> = {};
      if (profileName.trim())  payload.name = profileName.trim();
      if (profileEmail.trim()) payload.email = profileEmail.trim();
      if (profilePhone.trim()) payload.phoneNumber = profilePhone.trim();
      if (profileImageFile) {
        const body = new FormData();
        if (payload.name)        body.append("name", payload.name);
        if (payload.email)       body.append("email", payload.email);
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
      toast.success("Profile updated successfully.");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not update profile"),
  });

  function onUpdateProfile(e: FormEvent) { e.preventDefault(); updateProfile.mutate(); }

  if (profileError) return (
    <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-6">
      <p className="text-sm text-amber-700 dark:text-amber-200">{profileError}</p>
    </section>
  );
  if (profileLoading) return <AccountProfileSkeleton />;
  if (!safe) return (
    <section className="rounded-xl border border-stroke bg-card p-6">
      <p className="text-sm text-ink3">No profile data. Try refreshing or signing back in.</p>
    </section>
  );

  const displayImage = imagePreview ?? getProfileImageUrl(safe.profileImage);
  const initials     = safe.name.charAt(0).toUpperCase();
  const isAdmin      = safe.roles === "ADMIN";

  return (
    <div className="space-y-5">

      {/* ── Personal information ─────────────────── */}
      <motion.section
        custom={0} variants={section} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="flex items-start justify-between px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Personal information</h2>
            <p className="mt-0.5 text-xs text-ink4">Update your display name, email, and profile photo.</p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1">
              <ShieldIcon className="size-3 text-emerald-500" />
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Admin</span>
            </div>
          )}
        </div>

        {/* Avatar row */}
        <div className="border-y border-stroke bg-well/20 px-6 py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
            />
            <motion.button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="group relative shrink-0 self-start sm:self-center"
              aria-label="Change profile photo"
            >
              {displayImage && !avatarError ? (
                <img src={displayImage} alt={safe.name} onError={() => setAvatarError(true)} className="size-20 rounded-2xl object-cover ring-1 ring-stroke/80 shadow-sm" />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-2xl font-bold text-white ring-1 ring-stroke/80 shadow-sm">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <CameraIcon className="size-5 text-white drop-shadow" />
              </div>
            </motion.button>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink">{safe.name}</p>
              <p className="mt-0.5 text-xs text-ink4 truncate">{safe.email}</p>
              <div className="mt-2">
                {safe.isVerified ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Verified account
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/8 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <span className="size-1.5 rounded-full bg-amber-500" />
                    Email not verified
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-md border border-stroke bg-raised px-3 py-1.5 text-xs font-medium text-ink2 transition-colors hover:bg-well hover:text-ink"
                >
                  {profileImageFile ? "Change photo" : "Upload photo"}
                </button>
                {profileImageFile && (
                  <button
                    type="button"
                    onClick={() => handleImageFile(null)}
                    className="text-xs text-ink4 transition-colors hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
                <span className="text-[11px] text-ink4">JPG or PNG · max 2 MB</span>
              </div>
              <AnimatePresence>
                {profileImageFile && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="mt-2.5 inline-flex items-center gap-2 rounded-md border border-stroke bg-raised px-3 py-1.5 text-xs text-ink2"
                  >
                    <CameraIcon className="size-3.5 shrink-0 text-ink3" />
                    <span className="max-w-[200px] truncate">{profileImageFile.name}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Form */}
        <form id="profile-form" onSubmit={onUpdateProfile} className="px-6 py-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Full name</label>
              <input
                required minLength={2}
                placeholder="Your full name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className={inputClass}
                autoComplete="name"
              />
            </div>
            <div>
              <label className={labelClass}>Email address</label>
              <input
                required type="email"
                placeholder="you@example.com"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className={inputClass}
                autoComplete="email"
              />
            </div>
          </div>
          <div className="max-w-xs">
            <label className={labelClass}>
              Phone <span className="font-normal normal-case tracking-normal text-ink4">— optional</span>
            </label>
            <input
              placeholder="+1 555 000 0000"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              className={inputClass}
              autoComplete="tel"
            />
          </div>
        </form>

        <CardFooter>
          <p className="text-xs text-ink4">Changes take effect immediately.</p>
          <button
            type="submit"
            form="profile-form"
            disabled={updateProfile.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
          >
            {updateProfile.isPending && (
              <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
            )}
            {updateProfile.isPending ? "Saving…" : "Save changes"}
          </button>
        </CardFooter>
      </motion.section>

      {/* ── Danger zone ──────────────────────────── */}
      <motion.section
        custom={1} variants={section} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-red-500/15 bg-card"
      >
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-red-500 dark:text-red-400">Danger zone</h2>
          <p className="mt-0.5 text-xs text-ink4">Actions here are permanent and cannot be undone.</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-red-500/10 bg-red-500/4 px-6 py-5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-ink">Delete account</p>
            <p className="mt-0.5 text-xs text-ink4">
              Permanently removes your profile, orders, addresses, and all data.
            </p>
          </div>
          <ConfirmButton
            onConfirm={async () => {
              try {
                await apiFetch("/api/v1/users/deleteMe", { method: "DELETE", auth: true });
                toast.success("Account deleted.");
                window.location.href = "/";
              } catch {
                toast.error("Could not delete account. Please contact support.");
              }
            }}
            message="Permanently delete your account?"
            confirmLabel="Yes, delete"
            className="shrink-0 rounded-lg border border-red-500/25 bg-transparent px-4 py-2 text-sm font-medium text-red-500 dark:text-red-400 transition-colors hover:bg-red-500/10 hover:border-red-500/40"
          >
            Delete account
          </ConfirmButton>
        </div>
      </motion.section>

    </div>
  );
}
