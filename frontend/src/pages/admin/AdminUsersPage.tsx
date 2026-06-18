import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../lib/api";
import { AdminTableSkeleton } from "../../components/ProductSkeleton";
import type { User } from "../../lib/types";
import { usePageTitle } from "../../hooks/usePageTitle";
import { PackageIcon, SearchIcon, ShieldIcon, TrashIcon, UsersIcon, XIcon } from "../../components/Icons";
import { ConfirmButton } from "../../components/ConfirmButton";
import { useAuth } from "../../context/AuthContext";

type UsersRes = { status: string; data: { users: User[] } };

function initials(name: string): string {
  return name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.22 } },
  exit:   { opacity: 0, x: 24, transition: { duration: 0.18 } },
};

export function AdminUsersPage() {
  usePageTitle("Admin · Users");
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"ALL" | "USER" | "ADMIN">("ALL");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200);
    return () => clearTimeout(t);
  }, [search]);

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await apiFetch<UsersRes>("/api/v1/admin/users", { auth: true });
      return res.data.users;
    },
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, roles }: { id: string; roles: "USER" | "ADMIN" }) => {
      await apiFetch(`/api/v1/admin/users/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ roles }),
      });
    },
    onSuccess: async () => {
      toast.success("User role updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/v1/admin/users/${id}`, { method: "DELETE", auth: true });
    },
    onSuccess: async () => {
      toast.success("User deleted.");
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Delete failed"),
  });

  const allUsers = usersQuery.data ?? [];
  const adminCount = allUsers.filter((u) => String((u as Record<string, unknown>).roles ?? "USER") === "ADMIN").length;
  const userCount  = allUsers.length - adminCount;

  const filteredUsers = useMemo(() => {
    return allUsers
      .filter((u) => {
        const role = String((u as Record<string, unknown>).roles ?? "USER");
        return roleFilter === "ALL" || role === roleFilter;
      })
      .filter((u) => {
        if (!debouncedSearch.trim()) return true;
        const q = debouncedSearch.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      });
  }, [allUsers, roleFilter, debouncedSearch]);

  return (
    <>
      <Helmet>
        <title>Users — Admin · Northline</title>
        <meta name="description" content="Manage Northline users. View, edit roles, and moderate user accounts." />
        <meta property="og:title" content="Users — Admin · Northline" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>
      <section className="space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-stroke bg-card">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stroke px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UsersIcon className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Users</h2>
              <p className="text-xs text-ink4">
                {usersQuery.isPending ? "Loading…" : `${allUsers.length} total · ${adminCount} admin${adminCount !== 1 ? "s" : ""} · ${userCount} customer${userCount !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>

          {/* Stats pills */}
          <div className="hidden items-center gap-2 sm:flex">
            {[
              { label: "Total",    value: allUsers.length,  active: roleFilter === "ALL",   onClick: () => setRoleFilter("ALL") },
              { label: "Admins",   value: adminCount,       active: roleFilter === "ADMIN",  onClick: () => setRoleFilter("ADMIN") },
              { label: "Customers",value: userCount,        active: roleFilter === "USER",   onClick: () => setRoleFilter("USER") },
            ].map(({ label, value, active, onClick }) => (
              <button
                key={label}
                type="button"
                onClick={onClick}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "border-stroke bg-raised text-ink3 hover:bg-well hover:text-ink"
                }`}
              >
                {value} {label}
              </button>
            ))}
          </div>
        </div>

        {/* Search + mobile filter */}
        <div className="flex gap-2 border-b border-stroke px-4 py-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-ink4" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-lg border border-stroke bg-card py-2 pl-9 pr-9 text-sm text-ink placeholder:text-ink4 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/25"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink4 transition-colors hover:text-ink"
                aria-label="Clear search"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
          {/* Mobile role filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as typeof roleFilter)}
            className="shrink-0 rounded-lg border border-stroke bg-card px-3 py-2 text-sm text-ink focus:border-emerald-500/50 focus:outline-none sm:hidden"
          >
            <option value="ALL">All</option>
            <option value="ADMIN">Admins</option>
            <option value="USER">Customers</option>
          </select>
        </div>

        {/* Table */}
        <div className="p-0">
          {usersQuery.isPending ? (
            <div className="p-6"><AdminTableSkeleton /></div>
          ) : usersQuery.isError ? (
            <p className="p-6 text-sm text-red-400">
              {usersQuery.error instanceof Error ? usersQuery.error.message : "Failed to load users"}
            </p>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <UsersIcon className="size-8 text-ink4" />
              <p className="text-sm text-ink4">
                {debouncedSearch ? `No users matching "${debouncedSearch}".` : "No users found."}
              </p>
              {(debouncedSearch || roleFilter !== "ALL") && (
                <button
                  type="button"
                  onClick={() => { setSearch(""); setRoleFilter("ALL"); }}
                  className="text-sm font-medium text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-stroke bg-well/30">
                    <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">User</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">Status</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">Joined</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">Orders</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">Role</th>
                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-widest text-ink4">Actions</th>
                  </tr>
                </thead>
                <AnimatePresence initial={false}>
                  <tbody className="divide-y divide-stroke">
                    {filteredUsers.map((u) => {
                      const role = String((u as Record<string, unknown>).roles ?? "USER");
                      const isAdmin = role === "ADMIN";
                      const isVerified = Boolean((u as Record<string, unknown>).isVerified);
                      const createdAt = (u as Record<string, unknown>).createdAt as string | undefined;
                      const isSelf = u.id === currentUser?.id;
                      return (
                        <motion.tr
                          key={u.id}
                          variants={rowVariants}
                          initial="hidden"
                          animate="show"
                          exit="exit"
                          layout
                          className="group transition-colors hover:bg-hover"
                        >
                          <td className="py-3 pl-6 pr-4">
                            <div className="flex items-center gap-3">
                              <div className={`flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${isAdmin ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-ink4 to-ink3"}`}>
                                {initials(u.name)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-ink">{u.name}</span>
                                  {isSelf && (
                                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-sky-600 dark:text-sky-400">
                                      You
                                    </span>
                                  )}
                                  {isAdmin && (
                                    <span className="flex items-center gap-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                      <ShieldIcon className="size-2.5" />
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <p className="truncate text-xs text-ink4">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              isVerified
                                ? "border-emerald-500/20 bg-emerald-500/8 text-emerald-600 dark:text-emerald-400"
                                : "border-amber-500/20 bg-amber-500/8 text-amber-600 dark:text-amber-400"
                            }`}>
                              <span className={`size-1.5 rounded-full ${isVerified ? "bg-emerald-500" : "bg-amber-500"}`} />
                              {isVerified ? "Verified" : "Unverified"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-ink4">
                            {formatDate(createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/orders?userId=${u.id}&userName=${encodeURIComponent(u.name)}`)}
                              className="inline-flex items-center gap-1 rounded-lg border border-stroke bg-raised px-2.5 py-1.5 text-xs font-medium text-ink3 transition-colors hover:bg-well hover:text-ink"
                            >
                              <PackageIcon className="size-3" />
                              {(u as Record<string, unknown>).orderCount != null
                                ? String((u as Record<string, unknown>).orderCount)
                                : "—"}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={role}
                              onChange={(e) =>
                                updateRole.mutate({ id: u.id, roles: e.target.value as "USER" | "ADMIN" })
                              }
                              className="rounded-lg border border-stroke bg-input px-2.5 py-1.5 text-sm text-ink transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            >
                              <option value="USER">Customer</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <ConfirmButton
                              onConfirm={() => deleteUser.mutate(u.id)}
                              message={`Delete ${u.name}?`}
                              confirmLabel="Delete"
                              disabled={isSelf}
                              className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/8 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-30 dark:text-red-400"
                            >
                              <TrashIcon className="size-3.5" />
                              Delete
                            </ConfirmButton>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </AnimatePresence>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
    </>
  );
}
