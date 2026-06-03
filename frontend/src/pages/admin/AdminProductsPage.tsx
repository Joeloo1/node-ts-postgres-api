import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ApiError, apiFetch } from "../../lib/api";
import type { Product } from "../../lib/types";
import { PackageIcon } from "../../components/Icons";
import { ConfirmButton } from "../../components/ConfirmButton";

const inputClass =
  "w-full rounded-xl border border-stroke bg-input px-3 py-2.5 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-colors";

type ProductsRes = { status: string; data: { products: Product[] } };
type UpdateProductRes = { status: string; data: { product: Product } };

function getImageUrl(image?: string | null): string | null {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
  return `${base}/public/products/${image}`;
}

export function AdminProductsPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [brand, setBrand] = useState("");
  const [availability, setAvailability] = useState(true);
  const [files, setFiles] = useState<FileList | null>(null);

  const productsQuery = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await apiFetch<ProductsRes>("/api/v1/products?limit=100", { auth: true });
      return res.data.products;
    },
  });

  const productOptions = useMemo(() => productsQuery.data ?? [], [productsQuery.data]);

  const updateProduct = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const res = await apiFetch<UpdateProductRes>(`/api/v1/admin/products/${selected.product_id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          name: name.trim() || selected.name,
          brand: brand.trim() || undefined,
          availability,
          price: Number(price) || selected.price,
        }),
      });
      return res.data.product;
    },
    onSuccess: async () => {
      toast.success("Product updated.");
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Update failed"),
  });

  const deleteProduct = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      await apiFetch(`/api/v1/admin/products/${selected.product_id}`, { method: "DELETE", auth: true });
    },
    onSuccess: async () => {
      toast.success("Product deleted.");
      setSelected(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Delete failed"),
  });

  const uploadImages = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a product first");
      if (!files || files.length === 0) throw new Error("Pick images first");
      const body = new FormData();
      Array.from(files).forEach((f) => body.append("images", f));
      await apiFetch(`/api/v1/admin/products/${selected.product_id}/images?mode=append`, {
        method: "POST", auth: true, body,
      });
    },
    onSuccess: async () => {
      setFiles(null);
      toast.success("Images uploaded.");
      await queryClient.invalidateQueries({ queryKey: ["product", selected?.product_id] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Upload failed"),
  });

  function onSelectProduct(productId: string) {
    const p = productOptions.find((x) => x.product_id === productId) ?? null;
    setSelected(p);
    if (p) {
      setName(p.name);
      setPrice(String(p.price));
      setBrand(p.brand ?? "");
      setAvailability(Boolean(p.availability));
    }
  }

  function onDelete() {
    if (!selected) return;
    deleteProduct.mutate();
  }

  const productImage = selected ? getImageUrl(selected.image) : null;

  return (
    <section className="overflow-hidden rounded-2xl border border-stroke bg-card">
      {/* Section header */}
      <div className="flex items-center gap-3 border-b border-stroke px-6 py-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <PackageIcon className="size-4" />
        </div>
        <div>
          <h2 className="font-display text-sm font-semibold text-ink">Products</h2>
          <p className="text-xs text-ink4">
            {productOptions.length > 0 ? `${productOptions.length} products` : "Edit details or upload images"}
          </p>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {productsQuery.isError && (
          <p className="rounded-xl border border-red-900/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
            {productsQuery.error instanceof Error ? productsQuery.error.message : "Failed to load"}
          </p>
        )}

        {/* Product selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink3">Select product</label>
          <select
            value={selected?.product_id ?? ""}
            onChange={(e) => onSelectProduct(e.target.value)}
            className={inputClass}
          >
            <option value="">— Choose a product —</option>
            {productOptions.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.name} · ${p.price.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {selected ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="grid gap-6 md:grid-cols-[160px_1fr]"
          >
            {/* Image + availability badge */}
            <div className="flex flex-col items-center gap-3">
              {productImage ? (
                <img
                  src={productImage}
                  alt={selected.name}
                  className="h-40 w-40 rounded-2xl border border-stroke object-cover"
                />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-stroke bg-well text-xs text-ink4">
                  No image
                </div>
              )}
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                selected.availability
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                  : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
              }`}>
                {selected.availability ? "In stock" : "Out of stock"}
              </span>
            </div>

            {/* Edit form */}
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink3">Name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Product name" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink3">Price ($)</label>
                  <input value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} placeholder="0.00" type="number" min="0" step="0.01" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-ink3">Brand</label>
                  <input value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} placeholder="Brand name" />
                </div>
                <div className="flex items-end">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stroke bg-raised px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-well w-full">
                    <input
                      type="checkbox"
                      checked={availability}
                      onChange={(e) => setAvailability(e.target.checked)}
                      className="h-4 w-4 rounded accent-emerald-500"
                    />
                    Available for purchase
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => updateProduct.mutate()}
                  disabled={updateProduct.isPending}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {updateProduct.isPending ? "Saving…" : "Save changes"}
                </button>
                <ConfirmButton
                  onConfirm={onDelete}
                  message="Delete this product?"
                  confirmLabel="Yes, delete"
                  disabled={deleteProduct.isPending}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                >
                  {deleteProduct.isPending ? "Deleting…" : "Delete product"}
                </ConfirmButton>
              </div>

              {/* Image upload */}
              <div className="space-y-3 rounded-xl border border-stroke bg-raised p-4">
                <p className="text-sm font-semibold text-ink">Upload gallery images</p>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(e.target.files)}
                  className="w-full rounded-xl border border-stroke bg-input px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-emerald-500/40 file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink2 transition-colors"
                />
                {files && files.length > 0 && (
                  <p className="text-xs text-ink4">{files.length} file{files.length !== 1 ? "s" : ""} selected</p>
                )}
                <button
                  type="button"
                  onClick={() => uploadImages.mutate()}
                  disabled={uploadImages.isPending || !files || files.length === 0}
                  className="rounded-xl border border-stroke bg-card px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-hover disabled:opacity-50"
                >
                  {uploadImages.isPending ? "Uploading…" : "Upload images"}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="rounded-xl border border-stroke bg-raised p-8 text-center">
            <PackageIcon className="mx-auto size-10 text-ink4" />
            <p className="mt-3 text-sm text-ink4">Select a product from the dropdown to edit details or upload images.</p>
          </div>
        )}
      </div>
    </section>
  );
}
