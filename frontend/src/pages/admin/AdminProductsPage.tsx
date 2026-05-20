import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiError, apiFetch } from "../../lib/api";
import type { Product } from "../../lib/types";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-colors";

type ProductsRes = {
  status: string;
  data: { products: Product[] };
};

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
      const payload: Record<string, unknown> = {
        name: name.trim() || selected.name,
        brand: brand.trim() || undefined,
        availability,
        price: Number(price) || selected.price,
      };
      const res = await apiFetch<UpdateProductRes>(`/api/v1/admin/products/${selected.product_id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify(payload),
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
      await apiFetch(`/api/v1/admin/products/${selected.product_id}`, {
        method: "DELETE",
        auth: true,
      });
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
        method: "POST",
        auth: true,
        body,
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
    if (!window.confirm(`Delete "${selected.name}"? This cannot be undone.`)) return;
    deleteProduct.mutate();
  }

  const productImage = selected ? (getImageUrl(selected.image)) : null;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="font-display text-lg font-semibold text-white">Products</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Select a product to edit its details or upload images.
      </p>

      {productsQuery.isError && (
        <p className="mt-4 text-sm text-red-400">
          {productsQuery.error instanceof Error ? productsQuery.error.message : "Failed to load"}
        </p>
      )}

      <div className="mt-4 space-y-2">
        <label className="text-sm text-zinc-400">Select product</label>
        <select
          value={selected?.product_id ?? ""}
          onChange={(e) => onSelectProduct(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-colors"
        >
          <option value="">— Choose a product —</option>
          {productOptions.map((p) => (
            <option key={p.product_id} value={p.product_id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {selected ? (
        <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr]">
          {/* Product image preview */}
          <div className="flex flex-col items-center gap-3">
            {productImage ? (
              <img
                src={productImage}
                alt={selected.name}
                className="h-40 w-40 rounded-2xl border border-zinc-700 object-cover"
              />
            ) : (
              <div className="flex h-40 w-40 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950 text-xs text-zinc-600">
                No image
              </div>
            )}
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                selected.availability
                  ? "bg-emerald-900/40 text-emerald-400"
                  : "bg-red-900/30 text-red-400"
              }`}
            >
              {selected.availability ? "In stock" : "Out of stock"}
            </span>
          </div>

          {/* Edit form */}
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Name"
              />
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
                placeholder="Price"
                type="number"
                min="0"
                step="0.01"
              />
              <input
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className={inputClass}
                placeholder="Brand"
              />
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-300 hover:border-zinc-600 transition-colors">
                <input
                  type="checkbox"
                  checked={availability}
                  onChange={(e) => setAvailability(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-500"
                />
                Available for purchase
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateProduct.mutate()}
                disabled={updateProduct.isPending}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
              >
                {updateProduct.isPending ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleteProduct.isPending}
                className="rounded-lg border border-red-800/60 bg-red-950/30 px-4 py-2 text-sm font-semibold text-red-200 hover:bg-red-950/50 disabled:opacity-50 transition-colors"
              >
                {deleteProduct.isPending ? "Deleting…" : "Delete product"}
              </button>
            </div>

            <div className="space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
              <p className="text-sm font-medium text-white">Upload gallery images</p>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-800 file:px-3 file:py-1.5 file:text-zinc-200"
              />
              {files && files.length > 0 && (
                <p className="text-xs text-zinc-500">{files.length} file(s) selected</p>
              )}
              <button
                type="button"
                onClick={() => uploadImages.mutate()}
                disabled={uploadImages.isPending || !files || files.length === 0}
                className="rounded-lg bg-zinc-700 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-600 disabled:opacity-50 transition-colors"
              >
                {uploadImages.isPending ? "Uploading…" : "Upload images"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-950/30 p-8 text-center text-sm text-zinc-500">
          Select a product from the dropdown to edit or upload images.
        </div>
      )}
    </section>
  );
}
