import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { PackageIcon, ShieldIcon, UserIcon } from "../components/Icons";

const NAV = [
  { to: "/admin/products",   label: "Products",   icon: PackageIcon },
  { to: "/admin/users",      label: "Users",       icon: UserIcon },
  { to: "/admin/categories", label: "Categories",  icon: null },
  { to: "/admin/orders",     label: "Orders",      icon: null },
];

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all border ${
    isActive
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
      : "text-ink3 hover:bg-hover hover:text-ink border-transparent"
  }`;

export function AdminPage() {
  const location = useLocation();
  if (location.pathname === "/admin") {
    return <Navigate to="/admin/products" replace />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-start gap-3"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <ShieldIcon className="size-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Admin</h1>
          <p className="mt-0.5 text-sm text-ink4">Manage products, users, categories, and orders.</p>
        </div>
      </motion.div>

      {/* Tab nav */}
      <motion.nav
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.07 }}
        className="flex flex-wrap gap-2 rounded-2xl border border-stroke bg-card p-2"
        aria-label="Admin sections"
      >
        {NAV.map(({ to, label }) => (
          <NavLink key={to} to={to} className={tabClass}>
            {label}
          </NavLink>
        ))}
      </motion.nav>

      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
      >
        <Outlet />
      </motion.div>
    </div>
  );
}
