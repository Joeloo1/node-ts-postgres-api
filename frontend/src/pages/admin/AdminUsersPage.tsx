import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../lib/api";
import { AdminTableSkeleton } from "../../components/ProductSkeleton";
import type { User } from "../../lib/types";
import { UserIcon, TrashIcon, ShieldIcon } from "../../components/Icons";

type UsersRes = { status: string; data: { users: User[] } };

export function AdminUsersPage() {
  const queryClient = useQueryClient();

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

  function onDeleteUser(id: string, name: string) {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    deleteUser.mutate(id);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-stroke bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stroke px-6 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <UserIcon className="size-4" />
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold text-ink">Users</h2>
          <p className="text-xs text-ink4">
            {usersQuery.data ? `${usersQuery.data.length} users` : "Manage user roles and accounts"}
          </p>
        </div>
      </div>

      <div className="p-6">
        {usersQuery.isPending ? (
          <AdminTableSkeleton />
        ) : usersQuery.isError ? (
          <p className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {usersQuery.error instanceof Error ? usersQuery.error.message : "Failed to load users"}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-stroke">
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-widest text-ink4">User</th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-widest text-ink4">Email</th>
                  <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-widest text-ink4">Role</th>
                  <th className="pb-3 text-xs font-semibold uppercase tracking-widest text-ink4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stroke">
                {usersQuery.data?.map((u) => {
                  const role = String((u as Record<string, unknown>).roles ?? "USER");
                  const isAdmin = role === "ADMIN";
                  const initials = u.name.charAt(0).toUpperCase();
                  return (
                    <tr key={u.id} className="group transition-colors hover:bg-hover">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-well text-xs font-semibold text-ink2">
                            {initials}
                          </div>
                          <span className="font-medium text-ink">{u.name}</span>
                          {isAdmin && (
                            <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              <ShieldIcon className="size-2.5" />
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-ink4">{u.email}</td>
                      <td className="py-3 pr-4">
                        <select
                          value={role}
                          onChange={(e) =>
                            updateRole.mutate({ id: u.id, roles: e.target.value as "USER" | "ADMIN" })
                          }
                          className="rounded-lg border border-stroke bg-input px-2.5 py-1.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition-colors"
                        >
                          <option value="USER">USER</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          onClick={() => onDeleteUser(u.id, u.name)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                        >
                          <TrashIcon className="size-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {usersQuery.data?.length === 0 && (
              <p className="py-10 text-center text-sm text-ink4">No users found.</p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
