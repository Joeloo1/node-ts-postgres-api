import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ApiError, apiFetch } from "../../lib/api";
import type { Category } from "../../lib/types";
import { PlusIcon, TrashIcon } from "../../components/Icons";

type CategoriesRes = { status: string; data: { categories: Category[] } };

const listItem = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: 10, transition: { duration: 0.18 } },
};

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
      const created = name.trim();
      setName("");
      toast.success(`Category "${created}" created.`);
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
    <section className="overflow-hidden rounded-2xl border border-stroke bg-card">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stroke px-6 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <span className="text-sm font-bold">C</span>
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold text-ink">Categories</h2>
          <p className="text-xs text-ink4">
            {categoriesQuery.data ? `${categoriesQuery.data.length} categories` : "Manage product categories"}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Create form */}
        <form onSubmit={onCreate} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New category name…"
            className="min-w-0 flex-1 rounded-xl border border-stroke bg-input px-4 py-2.5 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-colors"
          />
          <button
            type="submit"
            disabled={createCategory.isPending || !name.trim()}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
          >
            <PlusIcon className="size-4" />
            {createCategory.isPending ? "Creating…" : "Create"}
          </button>
        </form>

        {/* List */}
        {categoriesQuery.isPending ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-well" />
            ))}
          </div>
        ) : categoriesQuery.isError ? (
          <p className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {categoriesQuery.error instanceof Error ? categoriesQuery.error.message : "Failed to load"}
          </p>
        ) : categoriesQuery.data?.length === 0 ? (
          <div className="rounded-xl border border-stroke bg-raised p-8 text-center">
            <p className="text-sm text-ink4">No categories yet. Create one above.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <ul className="space-y-2">
              {categoriesQuery.data?.map((c) => (
                <motion.li
                  key={c.category_id}
                  variants={listItem}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  layout
                  className="flex items-center justify-between rounded-xl border border-stroke bg-raised px-4 py-3 transition-colors hover:border-edge"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-well text-xs font-bold text-ink3">
                      {c.name.charAt(0)}
                    </span>
                    <span className="text-sm font-medium text-ink">{c.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDelete(c.category_id, c.name)}
                    className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <TrashIcon className="size-3.5" />
                    Delete
                  </button>
                </motion.li>
              ))}
            </ul>
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
