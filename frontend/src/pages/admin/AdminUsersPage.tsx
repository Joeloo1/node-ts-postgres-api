import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../lib/api";
import { AdminTableSkeleton } from "../../components/ProductSkeleton";
import type { User } from "../../lib/types";

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
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="font-display text-lg font-semibold text-white">Users</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {usersQuery.data ? `${usersQuery.data.length} users` : "Manage user roles and accounts."}
      </p>

      {usersQuery.isPending ? (
        <AdminTableSkeleton />
      ) : usersQuery.isError ? (
        <p className="mt-4 text-sm text-red-400">
          {usersQuery.error instanceof Error ? usersQuery.error.message : "Failed to load"}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-zinc-500">
              <tr className="border-b border-zinc-800">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Role</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersQuery.data?.map((u) => (
                <tr key={u.id} className="border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors">
                  <td className="py-3 pr-4 text-zinc-200">{u.name}</td>
                  <td className="py-3 pr-4 text-zinc-400">{u.email}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={String((u as Record<string, unknown>).roles ?? "USER")}
                      onChange={(e) =>
                        updateRole.mutate({ id: u.id, roles: e.target.value as "USER" | "ADMIN" })
                      }
                      className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => onDeleteUser(u.id, u.name)}
                      className="rounded-lg border border-red-800/50 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
