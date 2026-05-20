import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AccountProfileSkeleton } from "../components/ProductSkeleton";
import type { User } from "../lib/types";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-colors";

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

export function AccountProfilePage() {
  usePageTitle("Profile");
  const { user, isLoading: profileLoading, profileError } = useAuth();
  const queryClient = useQueryClient();

  const safe = useMemo(() => (user ? safeUserFields(user as User) : null), [user]);
  const isAdmin = safe?.roles === "ADMIN";

  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Password change state
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
    if (file) {
      const url = URL.createObjectURL(file);
      setImagePreview(url);
    } else {
      setImagePreview(null);
    }
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

      await apiFetch("/api/v1/users/updateMe", {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(payload),
      });
    },
    onSuccess: async () => {
      setProfileImageFile(null);
      setImagePreview(null);
      toast.success("Profile updated successfully.");
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Could not update profile");
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/users/updateMyPassword", {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ currentPassword, newPassword, passwordConfirm }),
      });
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setPasswordConfirm("");
      toast.success("Password changed. Please log in again.");
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : "Could not change password");
    },
  });

  function onUpdateProfile(e: FormEvent) {
    e.preventDefault();
    updateProfile.mutate();
  }

  function onChangePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== passwordConfirm) {
      toast.error("New passwords do not match");
      return;
    }
    changePassword.mutate();
  }

  if (profileError) {
    return (
      <section className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-6">
        <p className="text-sm text-amber-100/90">{profileError}</p>
        <p className="mt-2 text-sm text-zinc-400">
          Try signing out and back in.
        </p>
      </section>
    );
  }

  if (profileLoading) return <AccountProfileSkeleton />;

  if (!safe) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <p className="text-sm text-zinc-400">No profile data. Try refreshing or signing back in.</p>
      </section>
    );
  }

  const displayImage = imagePreview ?? getProfileImageUrl(safe.profileImage);

  return (
    <div className="space-y-6">
      {/* Profile info + edit */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Profile</h2>

        <div className="mt-4 flex items-center gap-4">
          {displayImage ? (
            <img
              src={displayImage}
              alt="Profile"
              className="size-16 rounded-full border border-zinc-700 object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 text-lg font-semibold text-zinc-200">
              {(safe.name || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-zinc-200">{safe.name}</p>
            <p className="text-xs text-zinc-500">{safe.email}</p>
            {isAdmin && (
              <span className="mt-1 inline-block rounded-full bg-emerald-900/50 px-2 py-0.5 text-xs font-medium text-emerald-400">
                Admin
              </span>
            )}
          </div>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {safe.phoneNumber && (
            <div>
              <dt className="text-zinc-500">Phone</dt>
              <dd className="text-white">{safe.phoneNumber}</dd>
            </div>
          )}
        </dl>

        <form onSubmit={onUpdateProfile} className="mt-8 space-y-3 border-t border-zinc-800 pt-8">
          <h3 className="text-sm font-medium text-white">Update profile</h3>
          <input
            required
            minLength={2}
            placeholder="Name"
            value={profileName}
            onChange={(e) => setProfileName(e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={profileEmail}
            onChange={(e) => setProfileEmail(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Phone (optional)"
            value={profilePhone}
            onChange={(e) => setProfilePhone(e.target.value)}
            className={inputClass}
          />
          <div className="space-y-1">
            <p className="text-xs text-zinc-500">Profile photo (JPG/PNG, resized to 500×500)</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleImageFile(e.target.files?.[0] ?? null)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-zinc-200"
            />
          </div>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            {updateProfile.isPending ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      {/* Password change */}
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="font-display text-lg font-semibold text-white">Change password</h2>
        <form onSubmit={onChangePassword} className="mt-4 space-y-3">
          <input
            required
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="password"
            minLength={8}
            placeholder="New password (min 8 chars)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <input
            required
            type="password"
            placeholder="Confirm new password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={changePassword.isPending}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 transition-colors"
          >
            {changePassword.isPending ? "Changing…" : "Change password"}
          </button>
        </form>
      </section>
    </div>
  );
}
