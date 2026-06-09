import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AccountProfileSkeleton } from "../components/ProductSkeleton";
import { CameraIcon, CheckIcon, ShieldIcon } from "../components/Icons";
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
    createdAt: u.createdAt ? String(u.createdAt) : undefined,
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
  const { user, isLoading: profileLoading, profileError, logout } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  const safe = useMemo(() => (user ? safeUserFields(user as User) : null), [user]);

  const [profileName, setProfileName]   = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!safe) return;
    setProfileName(safe.name ?? "");
    setProfileEmail(safe.email ?? "");
    setProfilePhone(safe.phoneNumber ?? "");
  }, [safe?.id]);

  const hasChanges = useMemo(() => {
    if (!safe) return false;
    return (
      profileName.trim() !== safe.name ||
      profileEmail.trim() !== safe.email ||
      profilePhone.trim() !== (safe.phoneNumber ?? "") ||
      profileImageFile !== null
    );
  }, [profileName, profileEmail, profilePhone, profileImageFile, safe]);

  const completionItems = useMemo(() => {
    if (!safe) return [];
    return [
      { label: "Name",  done: Boolean(safe.name) },
      { label: "Email", done: Boolean(safe.email) },
      { label: "Phone", done: Boolean(safe.phoneNumber) },
      { label: "Photo", done: Boolean(safe.profileImage) || imagePreview !== null },
    ];
  }, [safe, imagePreview]);
  const completionScore = completionItems.filter((c) => c.done).length;
  const completionPct   = Math.round((completionScore / Math.max(completionItems.length, 1)) * 100);

  function handleImageFile(file: File | null) {
    if (file && file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2 MB");
      return;
    }
    setProfileImageFile(file);
    setImagePreview(file ? URL.createObjectURL(file) : null);
    if (file) setAvatarError(false);
  }

  function handleDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handleImageFile(file);
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
        return apiFetch<{ requiresReauth?: boolean }>("/api/v1/users/updateMe", { method: "PATCH", auth: true, body });
      }
      return apiFetch<{ requiresReauth?: boolean }>("/api/v1/users/updateMe", { method: "PATCH", auth: true, body: JSON.stringify(payload) });
    },
    onSuccess: async (data) => {
      if (data?.requiresReauth) {
        toast.success("Email updated — check your new inbox to verify, then sign back in.");
        await logout();
        return;
      }
      setProfileImageFile(null);
      setImagePreview(null);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2500);
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
  const initials     = safe.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  const isAdmin      = safe.roles === "ADMIN";
  const memberSince  = safe.createdAt
    ? new Date(safe.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="space-y-5">

      {/* Personal information */}
      <motion.section
        custom={0} variants={section} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="flex items-start justify-between px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Personal information</h2>
            <p className="mt-0.5 text-xs text-ink4">Update your display name, email, and profile photo.</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <div className="flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/8 px-2.5 py-1">
                <ShieldIcon className="size-3 text-emerald-500" />
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Admin</span>
              </div>
            )}
            {/* Profile completion pill */}
            {completionPct < 100 && (
              <div className="hidden items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/8 px-2.5 py-1 sm:flex">
                <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  {completionScore}/{completionItems.length} complete
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Profile completion bar (only if not 100%) */}
        {completionPct === 100 ? (
          <div className="flex items-center gap-2 border-t border-emerald-500/15 bg-emerald-500/5 px-6 py-2.5">
            <CheckIcon className="size-3.5 text-emerald-500" />
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Profile complete</p>
          </div>
        ) : (
          <div className="border-t border-stroke bg-well/20 px-6 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-stroke">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${completionPct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                </div>
                <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink4">{completionPct}%</span>
              </div>
              <div className="hidden flex-wrap gap-2 sm:flex">
                {completionItems.map(({ label, done }) => (
                  <span
                    key={label}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      done
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/8 text-amber-600 dark:text-amber-400"
                    }`}
                  >
                    {done ? "✓" : "·"} {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

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
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative shrink-0 self-start rounded-2xl outline-none transition-all sm:self-center ${isDragging ? "ring-2 ring-emerald-500 ring-offset-2" : ""}`}
              aria-label="Change profile photo"
            >
              {displayImage && !avatarError ? (
                <img
                  src={displayImage}
                  alt={safe.name}
                  onError={() => setAvatarError(true)}
                  className="size-20 rounded-2xl object-cover shadow-sm ring-1 ring-stroke/80"
                />
              ) : (
                <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-2xl font-bold text-white shadow-sm ring-1 ring-stroke/80">
                  {initials}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <CameraIcon className="size-5 text-white drop-shadow" />
              </div>
            </motion.button>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{safe.name}</p>
              <p className="mt-0.5 truncate text-xs text-ink4">{safe.email}</p>
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
                <span className="text-[11px] text-ink4">JPG or PNG · max 2 MB · drag & drop</span>
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
        <form id="profile-form" onSubmit={onUpdateProfile} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="profileName">Full name</label>
              <input
                id="profileName"
                required
                minLength={2}
                placeholder="Your full name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className={inputClass}
                autoComplete="name"
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="profileEmail">Email address</label>
              <input
                id="profileEmail"
                required
                type="email"
                placeholder="you@example.com"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className={inputClass}
                autoComplete="email"
              />
              <AnimatePresence>
                {profileEmail.trim() !== safe.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400"
                  >
                    <svg className="size-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    Changing your email requires re-verification — you will be signed out.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="max-w-xs">
            <label className={labelClass} htmlFor="profilePhone">
              Phone <span className="font-normal normal-case tracking-normal text-ink4">— optional</span>
            </label>
            <input
              id="profilePhone"
              type="tel"
              placeholder="+1 555 000 0000"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              className={inputClass}
              autoComplete="tel"
            />
          </div>
        </form>

        <CardFooter>
          <div className="flex items-center gap-2">
            <AnimatePresence mode="wait">
              {hasChanges && (
                <motion.p
                  key="unsaved"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                >
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </motion.p>
              )}
            </AnimatePresence>
            {!hasChanges && (
              <p className="text-xs text-ink4">Changes take effect immediately.</p>
            )}
          </div>
          <AnimatePresence>
            {hasChanges && (
              <motion.button
                key="discard"
                type="button"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                onClick={() => {
                  if (!safe) return;
                  setProfileName(safe.name);
                  setProfileEmail(safe.email);
                  setProfilePhone(safe.phoneNumber ?? "");
                  setProfileImageFile(null);
                  setImagePreview(null);
                }}
                className="rounded-lg border border-stroke px-3.5 py-2 text-sm font-medium text-ink4 transition-colors hover:bg-raised hover:text-ink"
              >
                Discard
              </motion.button>
            )}
          </AnimatePresence>
          <button
            type="submit"
            form="profile-form"
            disabled={updateProfile.isPending || !hasChanges}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
              saveState === "saved"
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            }`}
          >
            {updateProfile.isPending ? (
              <>
                <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Saving…
              </>
            ) : saveState === "saved" ? (
              <>
                <CheckIcon className="size-3.5" />
                Saved!
              </>
            ) : "Save changes"}
          </button>
        </CardFooter>
      </motion.section>

      {/* Account metadata */}
      <motion.section
        custom={1} variants={section} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-ink">Account details</h2>
          <p className="mt-0.5 text-xs text-ink4">Read-only information about your account.</p>
        </div>
        <div className="grid gap-0 divide-y divide-stroke border-t border-stroke sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            { label: "Account ID",    value: `#${safe.id.slice(0, 8).toUpperCase()}` },
            { label: "Member since",  value: memberSince ?? "—" },
            { label: "Account type",  value: isAdmin ? "Administrator" : "Customer" },
          ].map(({ label, value }) => (
            <div key={label} className="px-6 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">{label}</p>
              <p className="mt-1 text-sm font-medium text-ink">{value}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Danger zone */}
      <motion.section
        custom={2} variants={section} initial="hidden" animate="show"
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
            className="shrink-0 rounded-lg border border-red-500/25 bg-transparent px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:border-red-500/40 hover:bg-red-500/10 dark:text-red-400"
          >
            Delete account
          </ConfirmButton>
        </div>
      </motion.section>

    </div>
  );
}
