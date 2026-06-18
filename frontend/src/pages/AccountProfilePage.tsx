import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
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

function CompletionRing({ pct, items }: { pct: number; items: { label: string; done: boolean }[] }) {
  const r    = 34;
  const circ = 2 * Math.PI * r;
  const offset = pct === 0 ? circ : circ * (1 - pct / 100);
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative shrink-0">
        <svg viewBox="0 0 100 100" className="size-[68px] -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="12" stroke="currentColor" className="text-stroke" />
          <circle
            cx="50" cy="50" r={r} fill="none" strokeWidth="12"
            stroke="currentColor" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            className="text-emerald-500"
            style={{ transition: "stroke-dashoffset 0.7s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[14px] font-bold tabular-nums leading-none text-ink">{pct}%</span>
          <span className="mt-0.5 text-[9px] font-medium text-ink4">done</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-1.5">
        {items.map(({ label, done }) => (
          <span
            key={label}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              done ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
            }`}
          >
            {done ? (
              <svg className="size-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <span className="size-1.5 shrink-0 rounded-full bg-amber-500" />
            )}
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

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
    <>
      <Helmet>
        <title>Profile — Northline</title>
        <meta name="description" content="Update your Northline profile details, name, avatar, and personal preferences." />
        <meta property="og:title" content="Profile — Northline" />
        <meta property="og:description" content="Update your Northline profile details." />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>
      <div className="space-y-5">

      {/* ── Personal information ──────────────────────────────────────── */}
      <motion.section
        custom={0} variants={section} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="flex flex-col lg:flex-row">

          {/* ── Left: Identity panel ─────────────────────────────────── */}
          <div className="relative flex flex-col border-b border-stroke lg:w-[240px] lg:shrink-0 lg:border-b-0 lg:border-r">

            {/* Cover */}
            <div className="relative h-[96px] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/40 via-teal-500/25 to-sky-600/10" />
              <div className="absolute inset-0 dot-grid opacity-[0.25]" />
              <div className="absolute -right-10 -top-10 size-52 rounded-full bg-emerald-500/25 blur-3xl" />
              <div className="absolute -left-6 top-2 size-28 rounded-full bg-teal-400/15 blur-2xl" />
              <div className="absolute right-1/3 bottom-0 size-20 rounded-full bg-sky-400/10 blur-2xl" />
              {/* Shimmer sweep */}
              <div className="absolute inset-0 -translate-x-full animate-[sweep_8s_ease-in-out_1s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
            </div>

            {/* Avatar + identity */}
            <div className="-mt-10 flex flex-col items-center px-5 pb-6">
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
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                className={`group relative rounded-full outline-none ${isDragging ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-card" : ""}`}
                aria-label="Change profile photo"
              >
                {displayImage && !avatarError ? (
                  <img
                    src={displayImage}
                    alt={safe.name}
                    onError={() => setAvatarError(true)}
                    className="size-20 rounded-full object-cover ring-[3px] ring-card shadow-xl"
                  />
                ) : (
                  <div className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-xl font-bold text-white ring-[3px] ring-card shadow-xl">
                    {initials}
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/60 opacity-0 backdrop-blur-[1px] transition-opacity duration-150 group-hover:opacity-100">
                  <CameraIcon className="size-5 text-white" />
                  <span className="text-[9px] font-bold uppercase tracking-wide text-white/90">Edit</span>
                </div>
                {profileImageFile && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                    <CheckIcon className="size-3 text-white" />
                  </span>
                )}
              </motion.button>

              {/* Name */}
              <p className="mt-3 text-center text-sm font-bold leading-tight text-ink">{safe.name || "—"}</p>

              {/* Admin badge */}
              {isAdmin && (
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                  <ShieldIcon className="size-2.5" />
                  Admin
                </span>
              )}

              {/* Email */}
              <p className="mt-1.5 max-w-full truncate text-center text-[11px] text-ink4">{safe.email}</p>
              {safe.phoneNumber && (
                <p className="mt-0.5 max-w-full truncate text-center text-[11px] text-ink4">{safe.phoneNumber}</p>
              )}

              {/* Status row */}
              <div className="mt-2 flex flex-col items-center gap-1">
                {safe.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    Email verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <span className="size-1.5 animate-pulse rounded-full bg-amber-500" />
                    Not verified
                  </span>
                )}
                {memberSince && (
                  <span className="text-[10px] text-ink4">Since {memberSince}</span>
                )}
              </div>

              {/* Divider */}
              <div className="my-5 w-full border-t border-stroke" />

              {/* Completion ring */}
              {completionPct < 100 ? (
                <CompletionRing pct={completionPct} items={completionItems} />
              ) : (
                <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <CheckIcon className="size-4 text-emerald-500" />
                  Profile complete
                </div>
              )}

              {/* Divider */}
              <div className="my-5 w-full border-t border-stroke" />

              {/* Upload controls */}
              <div className="flex w-full flex-col items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-stroke bg-raised px-3 py-2 text-xs font-medium text-ink2 transition-colors hover:bg-well hover:text-ink"
                >
                  <CameraIcon className="size-3.5" />
                  {profileImageFile ? "Change photo" : "Upload photo"}
                </button>
                {profileImageFile && (
                  <button
                    type="button"
                    onClick={() => handleImageFile(null)}
                    className="text-[11px] text-ink4 transition-colors hover:text-red-400"
                  >
                    Remove selection
                  </button>
                )}
                <p className="text-[10px] text-ink4">JPG / PNG · max 2 MB</p>
                <AnimatePresence>
                  {profileImageFile && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="flex w-full items-center gap-1.5 rounded-lg border border-stroke bg-raised px-2.5 py-1.5 text-[11px] text-ink3"
                    >
                      <CameraIcon className="size-3 shrink-0 text-ink4" />
                      <span className="min-w-0 flex-1 truncate">{profileImageFile.name}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* ── Right: Form ───────────────────────────────────────────── */}
          <div className="flex flex-1 flex-col">
            <div className="px-6 pt-6 pb-4">
              <h2 className="text-sm font-semibold text-ink">Contact details</h2>
              <p className="mt-0.5 text-xs text-ink4">Update your name, email address, and phone number.</p>
            </div>

            <form id="profile-form" onSubmit={onUpdateProfile} className="flex-1 space-y-4 px-6 pb-6 pt-0">
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
                {!hasChanges && <p className="text-xs text-ink4">Changes take effect immediately.</p>}
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
                className={`relative inline-flex items-center gap-2 overflow-hidden rounded-lg px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 ${
                  saveState === "saved"
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-500 hover:shadow-emerald-500/30 active:scale-[0.97]"
                }`}
              >
                {!updateProfile.isPending && saveState !== "saved" && hasChanges && (
                  <span className="absolute inset-0 -translate-x-full animate-[sweep_5s_ease-in-out_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
                )}
                {updateProfile.isPending ? (
                  <>
                    <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Saving…
                  </>
                ) : saveState === "saved" ? (
                  <><CheckIcon className="size-3.5" />Saved!</>
                ) : "Save changes"}
              </button>
            </CardFooter>
          </div>

        </div>
      </motion.section>

      {/* ── Account metadata ──────────────────────────────────────────── */}
      <motion.section
        custom={1} variants={section} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="px-6 py-5">
          <h2 className="text-sm font-semibold text-ink">Account details</h2>
          <p className="mt-0.5 text-xs text-ink4">Read-only information about your account.</p>
        </div>
        <div className="grid divide-y divide-stroke border-t border-stroke sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {[
            {
              icon: (
                <svg className="size-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              ),
              iconBg: "bg-emerald-500/10 ring-emerald-500/20",
              label: "Account ID",
              value: `#${safe.id.slice(0, 8).toUpperCase()}`,
            },
            {
              icon: (
                <svg className="size-4 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              ),
              iconBg: "bg-sky-500/10 ring-sky-500/20",
              label: "Member since",
              value: memberSince ?? "—",
            },
            {
              icon: (
                <svg className="size-4 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              ),
              iconBg: "bg-violet-500/10 ring-violet-500/20",
              label: "Account type",
              value: isAdmin ? "Administrator" : "Customer",
            },
          ].map(({ icon, iconBg, label, value }) => (
            <div key={label} className="group flex items-start gap-3 px-6 py-5 transition-colors hover:bg-raised/40">
              <div className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ring-1 ${iconBg}`}>
                {icon}
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-ink4">{label}</p>
                <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Danger zone ───────────────────────────────────────────────── */}
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
    </>
  );
}
