import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../lib/api";
import type { Category } from "../../lib/types";

type CategoriesRes = { status: string; data: { categories: Category[] } };

export function AdminCategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const categoriesQuery = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await apiFetch<CategoriesRes>("/api/v1/categories", { auth: true });
      return res.data.categories;
    },
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      await apiFetch("/api/v1/admin/categories", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ name: name.trim() }),
      });
    },
    onSuccess: async () => {
      setName("");
      toast.success(`Category "${name.trim()}" created.`);
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Create failed"),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/v1/admin/categories/${id}`, { method: "DELETE", auth: true });
    },
    onSuccess: async () => {
      toast.success("Category deleted.");
      await queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      await queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Delete failed"),
  });

  function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createCategory.mutate();
  }

  function onDelete(id: number, categoryName: string) {
    if (!window.confirm(`Delete category "${categoryName}"? Products in this category will be uncategorized.`)) return;
    deleteCategory.mutate(id);
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="font-display text-lg font-semibold text-white">Categories</h2>
      <p className="mt-1 text-sm text-zinc-500">
        {categoriesQuery.data ? `${categoriesQuery.data.length} categories` : "Manage product categories."}
      </p>

      <form onSubmit={onCreate} className="mt-4 flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category name"
          className="min-w-[240px] flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-colors"
        />
        <button
          type="submit"
          disabled={createCategory.isPending || !name.trim()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {createCategory.isPending ? "Creating…" : "Create"}
        </button>
      </form>

      {categoriesQuery.isPending ? (
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-zinc-800/60" />
          ))}
        </div>
      ) : categoriesQuery.isError ? (
        <p className="mt-4 text-sm text-red-400">
          {categoriesQuery.error instanceof Error ? categoriesQuery.error.message : "Failed to load"}
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {categoriesQuery.data?.map((c) => (
            <li
              key={c.category_id}
              className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 hover:bg-zinc-950/70 transition-colors"
            >
              <span className="text-zinc-200">{c.name}</span>
              <button
                type="button"
                onClick={() => onDelete(c.category_id, c.name)}
                className="rounded-lg border border-red-800/50 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40 transition-colors"
              >
                Delete
              </button>
            </li>
          ))}
          {categoriesQuery.data?.length === 0 && (
            <p className="py-4 text-center text-sm text-zinc-500">No categories yet.</p>
          )}
        </ul>
      )}
    </section>
  );
}
