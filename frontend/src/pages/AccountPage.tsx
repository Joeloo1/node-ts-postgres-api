import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { UserIcon, MapPinIcon, ShieldIcon } from "../components/Icons";

function getProfileImageUrl(image?: string): string | null {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
  return `${base}/public/users/${image}`;
}

const sideNavClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all border ${
    isActive
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : "text-ink3 hover:bg-hover hover:text-ink border-transparent"
  }`;

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors border ${
    isActive
      ? "bg-raised text-ink border-edge"
      : "text-ink3 hover:bg-raised hover:text-ink2 border-transparent"
  }`;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as number[] } },
};

export function AccountPage() {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (location.pathname === "/account") {
    return <Navigate to="/account/profile" replace />;
  }

  const u = user as Record<string, unknown> | null;
  const name = String(u?.name ?? "User");
  const email = String(u?.email ?? "");
  const isAdmin = String(u?.roles) === "ADMIN";
  const profileImage = u?.profileImage ? String(u.profileImage) : undefined;
  const displayImage = getProfileImageUrl(profileImage);
  const initials = name.charAt(0).toUpperCase();

  return (
    <div>
      {/* Page header */}
      <motion.div
        className="mb-8"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Account</h1>
        <p className="mt-1 text-sm text-ink4">Manage your profile and saved addresses.</p>
      </motion.div>

      <div className="lg:grid lg:grid-cols-4 lg:gap-8">

        {/* ── Sidebar ──────────────────────────────── */}
        <motion.aside
          className="mb-6 lg:mb-0"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* User card */}
          <motion.div
            variants={itemVariants}
            className="overflow-hidden rounded-2xl border border-stroke bg-card"
          >
            {/* Gradient header */}
            <div className="relative h-16 bg-gradient-to-br from-emerald-900/60 via-zinc-900 to-zinc-900">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-10%,rgba(16,185,129,0.15),transparent)]" />
            </div>

            {/* Avatar (overlapping header) */}
            <div className="-mt-10 flex flex-col items-center px-5 pb-5">
              <motion.div
                className="relative"
                whileHover={{ scale: 1.04 }}
                transition={{ duration: 0.2 }}
              >
                {displayImage ? (
                  <img
                    src={displayImage}
                    alt={name}
                    className="size-20 rounded-full border-4 border-raised object-cover shadow-xl"
                  />
                ) : (
                  <div className="flex size-20 items-center justify-center rounded-full border-4 border-raised bg-gradient-to-br from-emerald-600 to-teal-700 text-2xl font-bold text-white shadow-xl">
                    {initials}
                  </div>
                )}
                {isAdmin && (
                  <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-raised">
                    <ShieldIcon className="size-3 text-white" />
                  </span>
                )}
              </motion.div>

              <p className="mt-3 font-semibold text-ink">{name}</p>
              <p className="mt-0.5 max-w-full truncate text-xs text-ink4">{email}</p>

              {isAdmin && (
                <span className="mt-2 inline-block rounded-full border border-emerald-800/40 bg-emerald-900/40 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  Admin
                </span>
              )}
            </div>
          </motion.div>

          {/* Desktop vertical nav */}
          <motion.nav
            variants={itemVariants}
            className="mt-3 hidden space-y-1 lg:block"
          >
            <NavLink to="/account/profile" className={sideNavClass}>
              <UserIcon className="size-4 shrink-0" />
              Profile
            </NavLink>
            <NavLink to="/account/addresses" className={sideNavClass}>
              <MapPinIcon className="size-4 shrink-0" />
              Addresses
            </NavLink>
          </motion.nav>

          {/* Mobile horizontal tab nav */}
          <nav className="mt-3 flex gap-2 lg:hidden">
            <NavLink to="/account/profile" className={tabClass}>
              <UserIcon className="size-4" />
              Profile
            </NavLink>
            <NavLink to="/account/addresses" className={tabClass}>
              <MapPinIcon className="size-4" />
              Addresses
            </NavLink>
          </nav>

          {/* Sign out — desktop */}
          <motion.div variants={itemVariants} className="mt-3 hidden lg:block">
            <button
              type="button"
              onClick={() => logout()}
              className="w-full rounded-xl border border-stroke px-4 py-2.5 text-sm font-medium text-ink4 transition-colors hover:border-red-800/50 hover:bg-red-950/20 hover:text-red-400"
            >
              Sign out
            </button>
          </motion.div>
        </motion.aside>

        {/* ── Content ──────────────────────────────── */}
        <main className="lg:col-span-3">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
