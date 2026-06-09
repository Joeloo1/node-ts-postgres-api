import { NavLink, Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useTheme } from "../context/ThemeContext";
import { ApiError, apiFetch } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import * as orderService from "../services/orders";
import {
  UserIcon, MapPinIcon, ShieldIcon, XIcon,
  LockClosedIcon, PackageIcon, HeartIcon,
  SunIcon, MoonIcon,
} from "../components/Icons";

function getProfileImageUrl(image?: string): string | null {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
  return `${base}/public/users/${image}`;
}

function greeting(name: string): string {
  const h = new Date().getHours();
  const tod = h < 12 ? "morning" : h < 17 ? "afternoon" : "evening";
  const first = name.split(" ")[0] || name;
  return `Good ${tod}, ${first}`;
}

function SidebarAvatar({ src, name, initials }: { src: string | null; name: string; initials: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name}
        className="size-12 rounded-full object-cover ring-2 ring-stroke"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-sm font-bold text-white">
      {initials}
    </div>
  );
}

function SettingsLink({
  to,
  icon: Icon,
  label,
  external,
  badge,
  end,
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  external?: boolean;
  badge?: number;
  end?: boolean;
}) {
  const cls = "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all";

  if (external) {
    return (
      <Link to={to} className={`${cls} text-ink3 hover:bg-hover hover:text-ink`}>
        <Icon className="size-4 shrink-0" />
        <span className="flex-1">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="rounded-full bg-raised px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-ink3">
            {badge}
          </span>
        )}
        <svg className="size-3 text-ink4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        </svg>
      </Link>
    );
  }

  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `${cls} ${isActive
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold"
          : "text-ink3 hover:bg-hover hover:text-ink"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={`size-4 shrink-0 ${isActive ? "text-emerald-600 dark:text-emerald-400" : ""}`} />
          <span className="flex-1">{label}</span>
          {badge !== undefined && badge > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
              isActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-raised text-ink3"
            }`}>
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export function AccountPage() {
  const { user, logout } = useAuth();
  const { wishlist } = useWishlist();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const [verifyBannerDismissed, setVerifyBannerDismissed] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const ordersQuery = useQuery({
    queryKey: queryKeys.orders(),
    queryFn: orderService.getOrders,
    staleTime: 60_000,
  });

  const resendMutation = useMutation({
    mutationFn: () => apiFetch("/api/v1/users/resendVerificationEmail", { method: "POST", auth: true }),
    onSuccess: () => {
      setEmailSent(true);
      toast.success("Verification email sent — check your inbox.");
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not send verification email"),
  });

  const u = user as Record<string, unknown> | null;
  const name = String(u?.name ?? "User");
  const email = String(u?.email ?? "");
  const isAdmin = String(u?.roles) === "ADMIN";
  const isVerified = Boolean(u?.isVerified);
  const profileImage = u?.profileImage ? String(u.profileImage) : undefined;
  const displayImage = getProfileImageUrl(profileImage);
  const initials = useMemo(
    () => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase(),
    [name],
  );
  const orderCount = ordersQuery.isPending ? null : (ordersQuery.data?.length ?? 0);
  const memberSince = u?.createdAt
    ? new Date(String(u.createdAt)).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  const showVerifyBanner = !verifyBannerDismissed && isVerified === false;

  if (location.pathname === "/account") {
    return <Navigate to="/account/profile" replace />;
  }

  return (
    <div>
      {/* Email verification banner */}
      <AnimatePresence>
        {showVerifyBanner && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mb-6 flex items-start justify-between gap-4 rounded-xl border border-amber-500/25 bg-amber-500/8 px-5 py-4"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 shrink-0 text-amber-500">
                <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Verify your email address</p>
                <p className="mt-0.5 text-xs text-amber-700/75 dark:text-amber-300/65">
                  {emailSent
                    ? "A new link has been sent. Check your inbox and spam folder."
                    : "A verification link was sent to your inbox. Didn't receive it?"}
                </p>
                {!emailSent && (
                  <button
                    type="button"
                    onClick={() => resendMutation.mutate()}
                    disabled={resendMutation.isPending}
                    className="mt-2 text-xs font-semibold text-amber-600 underline underline-offset-2 decoration-amber-500/50 transition-colors hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300 disabled:opacity-50"
                  >
                    {resendMutation.isPending ? "Sending…" : "Resend verification email"}
                  </button>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setVerifyBannerDismissed(true)}
              className="mt-0.5 shrink-0 text-amber-500/50 transition-colors hover:text-amber-400"
              aria-label="Dismiss"
            >
              <XIcon className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page heading */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Account</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-ink sm:text-3xl">{greeting(name)}</h1>
        <p className="mt-1 text-sm text-ink4">Manage your profile, security, and preferences.</p>
      </motion.div>

      <div className="lg:grid lg:grid-cols-[256px_1fr] lg:gap-8">

        {/* Sidebar */}
        <motion.aside
          className="mb-6 lg:mb-0"
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Identity card */}
          <div className="mb-4 overflow-hidden rounded-xl border border-stroke bg-card">
            {/* Cover strip */}
            <div className="h-12 bg-gradient-to-r from-emerald-600/25 via-teal-500/15 to-transparent" />

            <div className="-mt-6 flex items-end gap-3 px-4 pb-4">
              <div className="relative shrink-0">
                <SidebarAvatar src={displayImage} name={name} initials={initials} />
                {isAdmin && (
                  <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-card">
                    <ShieldIcon className="size-2.5 text-white" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1 pb-1">
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
                <p className="truncate text-[11px] text-ink4">{email}</p>
              </div>
            </div>

            <div className="border-t border-stroke px-4 pb-3 pt-2">
              <div className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${isVerified ? "bg-emerald-500" : "bg-amber-500"}`} />
                <span className={`text-[11px] font-medium ${isVerified ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                  {isVerified ? "Verified account" : "Email not verified"}
                </span>
              </div>
              {memberSince && (
                <p className="mt-0.5 text-[10px] text-ink4">Member since {memberSince}</p>
              )}
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-2 divide-x divide-stroke border-t border-stroke">
              <Link to="/orders" className="flex flex-col items-center gap-0.5 py-3 transition-colors hover:bg-hover">
                <span className="text-base font-bold tabular-nums leading-none text-ink">
                  {orderCount === null ? "—" : orderCount}
                </span>
                <span className="text-[10px] text-ink4">Orders</span>
              </Link>
              <Link to="/wishlist" className="flex flex-col items-center gap-0.5 py-3 transition-colors hover:bg-hover">
                <span className="text-base font-bold tabular-nums leading-none text-ink">{wishlist.size}</span>
                <span className="text-[10px] text-ink4">Saved</span>
              </Link>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden space-y-5 lg:block">
            <NavGroup label="Account">
              <SettingsLink to="/account/profile" icon={UserIcon} label="Profile" end />
              <SettingsLink to="/account/security" icon={LockClosedIcon} label="Security" end />
              <SettingsLink to="/account/addresses" icon={MapPinIcon} label="Addresses" end />
            </NavGroup>

            <NavGroup label="Shopping">
              <SettingsLink to="/orders" icon={PackageIcon} label="Orders" external badge={orderCount ?? 0} />
              <SettingsLink to="/wishlist" icon={HeartIcon} label="Wishlist" external badge={wishlist.size} />
            </NavGroup>

            <NavGroup label="Preferences">
              <button
                type="button"
                onClick={toggleTheme}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink3 transition-all hover:bg-hover hover:text-ink"
              >
                {theme === "dark"
                  ? <SunIcon className="size-4 shrink-0" />
                  : <MoonIcon className="size-4 shrink-0" />
                }
                <span className="flex-1 text-left">
                  {theme === "dark" ? "Light mode" : "Dark mode"}
                </span>
                <span className="rounded-full border border-stroke bg-raised px-2 py-0.5 text-[10px] font-medium text-ink4">
                  {theme === "dark" ? "Light" : "Dark"}
                </span>
              </button>
            </NavGroup>

            <div className="border-t border-stroke pt-2">
              <button
                type="button"
                onClick={() => logout()}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink4 transition-all hover:bg-red-500/8 hover:text-red-400"
              >
                <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                Sign out
              </button>
            </div>
          </nav>

          {/* Mobile tab nav */}
          <nav className="flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
            {[
              { to: "/account/profile",   icon: UserIcon,       label: "Profile",   end: true },
              { to: "/account/security",  icon: LockClosedIcon, label: "Security",  end: true },
              { to: "/account/addresses", icon: MapPinIcon,     label: "Addresses", end: true },
              { to: "/orders",            icon: PackageIcon,    label: "Orders",    end: false },
              { to: "/wishlist",          icon: HeartIcon,      label: "Wishlist",  end: false },
            ].map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-stroke bg-card text-ink3 hover:bg-raised hover:text-ink"
                  }`
                }
              >
                <Icon className="size-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile sign-out */}
          <div className="mt-1 lg:hidden">
            <button
              type="button"
              onClick={() => logout()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-stroke bg-card px-3.5 py-2 text-sm font-medium text-ink4 transition-colors hover:border-red-500/20 hover:bg-red-500/8 hover:text-red-400"
            >
              <svg className="size-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Sign out
            </button>
          </div>
        </motion.aside>

        {/* Content */}
        <main>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
