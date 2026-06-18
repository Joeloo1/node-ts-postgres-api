import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { ApiError, apiFetch } from "../../lib/api";
import type { Product } from "../../lib/types";
import { CameraIcon, CheckIcon, PackageIcon } from "../../components/Icons";
import { ConfirmButton } from "../../components/ConfirmButton";
import { usePageTitle } from "../../hooks/usePageTitle";

const inputClass =
  "w-full rounded-xl border border-stroke bg-input px-3.5 py-2.5 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/60 transition-colors";
const labelClass = "mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-ink4";

type ProductsRes = { status: string; data: { products: Product[] } };
type CreateProductRes = { status: string; data: { product: Product } };
type UpdateProductRes = { status: string; data: { product: Product } };
type CategoriesRes = { status: string; data: { categories: { category_id: number; name: string }[] } };

interface CreateForm {
  name: string;
  description: string;
  price: string;
  brand: string;
  stock: string;
  discount: string;
  category_id: string;
  unit: string;
  availability: boolean;
}

const BLANK_FORM: CreateForm = {
  name: "", description: "", price: "", brand: "",
  stock: "0", discount: "0", category_id: "", unit: "", availability: true,
};

function getImageUrl(image?: string | null): string | null {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "";
  return `${base}/public/products/${image}`;
}

function FieldGroup({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1.5">{children}</div>;
}

export function AdminProductsPage() {
  usePageTitle("Admin · Products");
  const queryClient = useQueryClient();
  const [view, setView] = useState<"create" | "manage">("create");

  /* ── Create form state ──────────────────────────────── */
  const [form, setForm] = useState<CreateForm>(BLANK_FORM);
  const [createSuccess, setCreateSuccess] = useState<Product | null>(null);
  const [imageFiles, setImageFiles]       = useState<{ file: File; preview: string }[]>([]);
  const [isDragging, setIsDragging]       = useState(false);
  const imageInputRef  = useRef<HTMLInputElement>(null);
  const submittingRef  = useRef(false);

  function patchForm(patch: Partial<CreateForm>) {
    setForm((f) => ({ ...f, ...patch }));
  }

  function addImageFiles(incoming: File[]) {
    const valid: { file: File; preview: string }[] = [];
    for (const f of incoming) {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); continue; }
      if (f.size > 5 * 1024 * 1024)    { toast.error(`${f.name} exceeds 5 MB`);     continue; }
      valid.push({ file: f, preview: URL.createObjectURL(f) });
    }
    setImageFiles((prev) => [...prev, ...valid]);
  }

  function removeImageFile(idx: number) {
    setImageFiles((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  }

  function clearImageFiles() {
    setImageFiles((prev) => { prev.forEach((p) => URL.revokeObjectURL(p.preview)); return []; });
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    addImageFiles(Array.from(e.dataTransfer.files));
  }

  /* ── Manage state ───────────────────────────────────── */
  const [selected, setSelected]         = useState<Product | null>(null);
  const [editName, setEditName]         = useState("");
  const [editPrice, setEditPrice]       = useState("");
  const [editBrand, setEditBrand]       = useState("");
  const [editStock, setEditStock]       = useState("");
  const [editDiscount, setEditDiscount] = useState("");
  const [editDesc, setEditDesc]         = useState("");
  const [editAvail, setEditAvail]       = useState(true);
  // Gallery upload for manage tab
  const [manageFiles, setManageFiles]       = useState<{ file: File; preview: string }[]>([]);
  const [manageDragging, setManageDragging] = useState(false);
  const manageInputRef = useRef<HTMLInputElement>(null);

  function addManageFiles(incoming: File[]) {
    const valid: { file: File; preview: string }[] = [];
    for (const f of incoming) {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); continue; }
      if (f.size > 5 * 1024 * 1024)    { toast.error(`${f.name} exceeds 5 MB`);     continue; }
      valid.push({ file: f, preview: URL.createObjectURL(f) });
    }
    setManageFiles((prev) => [...prev, ...valid]);
  }

  function removeManageFile(idx: number) {
    setManageFiles((prev) => { URL.revokeObjectURL(prev[idx].preview); return prev.filter((_, i) => i !== idx); });
  }

  function clearManageFiles() {
    setManageFiles((prev) => { prev.forEach((p) => URL.revokeObjectURL(p.preview)); return []; });
  }

  function handleManageDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setManageDragging(false);
    addManageFiles(Array.from(e.dataTransfer.files));
  }

  /* ── Queries ────────────────────────────────────────── */
  const productsQ = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const res = await apiFetch<ProductsRes>("/api/v1/products?limit=100", { auth: true });
      return res.data.products;
    },
  });

  const categoriesQ = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await apiFetch<CategoriesRes>("/api/v1/categories");
      return res.data.categories;
    },
    staleTime: 5 * 60_000,
  });

  const products   = useMemo(() => productsQ.data ?? [], [productsQ.data]);
  const categories = useMemo(() => categoriesQ.data ?? [], [categoriesQ.data]);

  /* ── Create mutation (create → upload image if picked) ─ */
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Product name is required");
      if (!form.description.trim()) throw new Error("Description is required");
      if (!form.price || Number(form.price) <= 0) throw new Error("Price must be greater than 0");

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        availability: form.availability,
        stock: Number(form.stock) || 0,
      };
      if (form.brand.trim())         body.brand       = form.brand.trim();
      if (form.unit.trim())          body.unit        = form.unit.trim();
      if (Number(form.discount) > 0) body.discount    = Number(form.discount);
      if (form.category_id)          body.category_id = Number(form.category_id);

      const res = await apiFetch<CreateProductRes>("/api/v1/admin/products", {
        method: "POST", auth: true, body: JSON.stringify(body),
      });
      const product = res.data.product;

      // Upload all chosen images immediately after creation
      if (imageFiles.length > 0) {
        const fd = new FormData();
        imageFiles.forEach(({ file }) => fd.append("images", file));
        await apiFetch(`/api/v1/admin/products/${product.product_id}/images?mode=append`, {
          method: "POST", auth: true, body: fd,
        });
      }

      return product;
    },
    onSuccess: async (product) => {
      toast.success(`"${product.name}" created successfully!`);
      setCreateSuccess(product);
      clearImageFiles();
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Failed to create product"),
  });

  function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setCreateSuccess(null);
    createMutation.mutate(undefined, {
      onSettled: () => { submittingRef.current = false; },
    });
  }

  function switchToManageNew(product: Product) {
    setSelected(product);
    setEditName(product.name);
    setEditPrice(String(product.price));
    setEditBrand(product.brand ?? "");
    setEditStock(String(product.stock ?? 0));
    setEditDiscount(String(product.discount ?? 0));
    setEditDesc(String((product as Record<string, unknown>).description ?? ""));
    setEditAvail(Boolean(product.availability));
    setCreateSuccess(null);
    setForm(BLANK_FORM);
    clearImageFiles();
    setView("manage");
  }

  /* ── Update mutation ────────────────────────────────── */
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!selected) return;
      const res = await apiFetch<UpdateProductRes>(`/api/v1/admin/products/${selected.product_id}`, {
        method: "PATCH", auth: true,
        body: JSON.stringify({
          name:        editName.trim()  || selected.name,
          brand:       editBrand.trim() || undefined,
          availability: editAvail,
          price:       Number(editPrice) || selected.price,
          stock:       Number(editStock),
          discount:    Number(editDiscount),
          description: editDesc.trim()  || undefined,
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

  /* ── Delete mutation ────────────────────────────────── */
  const deleteMutation = useMutation({
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

  /* ── Remove existing image mutation ────────────────── */
  const removeExistingImageMutation = useMutation({
    mutationFn: async (imageToRemove: string) => {
      if (!selected) throw new Error("No product selected");
      const currentImages: string[] = Array.isArray((selected as any).images)
        ? (selected as any).images
        : selected.image ? [selected.image] : [];
      const nextImages = currentImages.filter((img) => img !== imageToRemove);
      const res = await apiFetch<UpdateProductRes>(`/api/v1/admin/products/${selected.product_id}`, {
        method: "PATCH", auth: true,
        body: JSON.stringify({ images: nextImages }),
      });
      return res.data.product;
    },
    onSuccess: async (updated) => {
      setSelected(updated);
      toast.success("Image removed.");
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Remove failed"),
  });

  /* ── Upload new manage images mutation ──────────────── */
  const uploadManageImagesMutation = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a product first");
      if (!manageFiles.length) throw new Error("Pick images first");
      const body = new FormData();
      manageFiles.forEach(({ file }) => body.append("images", file));
      const res = await apiFetch<UpdateProductRes>(
        `/api/v1/admin/products/${selected.product_id}/images?mode=append`,
        { method: "POST", auth: true, body },
      );
      return res.data.product;
    },
    onSuccess: async (updated) => {
      setSelected(updated);
      clearManageFiles();
      toast.success("Images uploaded.");
      await queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Upload failed"),
  });

  function onSelectProduct(productId: string) {
    const p = products.find((x) => x.product_id === productId) ?? null;
    setSelected(p);
    if (p) {
      setEditName(p.name);
      setEditPrice(String(p.price));
      setEditBrand(p.brand ?? "");
      setEditStock(String(p.stock ?? 0));
      setEditDiscount(String(p.discount ?? 0));
      setEditDesc(String((p as Record<string, unknown>).description ?? ""));
      setEditAvail(Boolean(p.availability));
    }
  }

  const productImage = selected ? getImageUrl(selected.image) : null;

  /* ── Tab button style ───────────────────────────────── */
  const tabBtn = (active: boolean) =>
    `flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
      active
        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm"
        : "text-ink4 hover:bg-hover hover:text-ink"
    }`;

  return (
    <>
      <Helmet>
        <title>Products — Admin · Northline</title>
        <meta name="description" content="Manage Northline product catalogue. Add, edit, and remove products from the admin panel." />
        <meta property="og:title" content="Products — Admin · Northline" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Northline" />
      </Helmet>
      <section className="overflow-hidden rounded-2xl border border-stroke bg-card">

      {/* ── Header + tabs ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stroke px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <PackageIcon className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">Products</h2>
            <p className="text-xs text-ink4">
              {products.length > 0 ? `${products.length} products in catalog` : "No products yet"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-stroke bg-raised p-1">
          <button type="button" className={tabBtn(view === "create")} onClick={() => { setView("create"); setCreateSuccess(null); }}>
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New product
          </button>
          <button type="button" className={tabBtn(view === "manage")} onClick={() => { setView("manage"); setCreateSuccess(null); }}>
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 0 1 1.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.559.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 0 1-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 0 1-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.764-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 0 1 .12-1.45l.773-.773a1.125 1.125 0 0 1 1.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Manage
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* ════════════════════════════════════════════════
            CREATE PRODUCT VIEW
        ════════════════════════════════════════════════ */}
        {view === "create" && (
          <motion.div
            key="create"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-6"
          >

            {/* Success banner */}
            <AnimatePresence>
              {createSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <CheckIcon className="size-4 shrink-0 text-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        "{createSuccess.name}" created!
                      </p>
                      <p className="text-xs text-emerald-600/80 dark:text-emerald-400/70">
                        ID: #{createSuccess.product_id.slice(0, 8).toUpperCase()} · Now upload images or edit further.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => switchToManageNew(createSuccess)}
                    className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    Upload images →
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleCreate} className="space-y-6">

              {/* Basic info */}
              <div>
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-ink4">Basic information</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <FieldGroup>
                      <label className={labelClass} htmlFor="c-name">Product name <span className="text-red-400">*</span></label>
                      <input
                        id="c-name"
                        required
                        value={form.name}
                        onChange={(e) => patchForm({ name: e.target.value })}
                        className={inputClass}
                        placeholder="e.g. Sony WH-1000XM5 Wireless Headphones"
                      />
                    </FieldGroup>
                  </div>

                  <div className="sm:col-span-2">
                    <FieldGroup>
                      <label className={labelClass} htmlFor="c-desc">Description <span className="text-red-400">*</span></label>
                      <textarea
                        id="c-desc"
                        required
                        rows={5}
                        value={form.description}
                        onChange={(e) => patchForm({ description: e.target.value })}
                        className={`${inputClass} resize-y`}
                        placeholder="Describe the product — features, specs, what's included…"
                      />
                    </FieldGroup>
                  </div>

                  <FieldGroup>
                    <label className={labelClass} htmlFor="c-brand">Brand</label>
                    <input
                      id="c-brand"
                      value={form.brand}
                      onChange={(e) => patchForm({ brand: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. Sony"
                    />
                  </FieldGroup>

                  <FieldGroup>
                    <label className={labelClass} htmlFor="c-unit">Unit / type</label>
                    <input
                      id="c-unit"
                      value={form.unit}
                      onChange={(e) => patchForm({ unit: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. pair, piece, kg"
                    />
                  </FieldGroup>

                  <FieldGroup>
                    <label className={labelClass} htmlFor="c-category">Category</label>
                    <select
                      id="c-category"
                      value={form.category_id}
                      onChange={(e) => patchForm({ category_id: e.target.value })}
                      className={inputClass}
                    >
                      <option value="">— No category —</option>
                      {categories.map((c) => (
                        <option key={c.category_id} value={c.category_id}>{c.name}</option>
                      ))}
                    </select>
                  </FieldGroup>

                  <div className="sm:col-span-2">
                    <FieldGroup>
                      <label className={labelClass}>
                        Product images
                        {imageFiles.length > 0 && (
                          <span className="ml-2 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                            {imageFiles.length} selected
                          </span>
                        )}
                      </label>

                      {/* Hidden file input — multiple */}
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files) addImageFiles(Array.from(e.target.files));
                          e.target.value = "";
                        }}
                      />

                      {/* Drop zone */}
                      <div
                        onClick={() => imageInputRef.current?.click()}
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        className={`flex h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all ${
                          isDragging
                            ? "border-emerald-500 bg-emerald-500/8"
                            : "border-stroke bg-raised/40 hover:border-emerald-500/50 hover:bg-emerald-500/4"
                        }`}
                      >
                        <div className="flex size-9 items-center justify-center rounded-xl bg-raised">
                          <CameraIcon className="size-4 text-ink4" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-ink3">
                            {isDragging ? "Drop images here!" : "Click to add images or drag & drop"}
                          </p>
                          <p className="mt-0.5 text-xs text-ink4">JPG, PNG, WebP · max 5 MB each · unlimited count</p>
                        </div>
                      </div>

                      {/* Preview grid */}
                      <AnimatePresence>
                        {imageFiles.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                              {imageFiles.map(({ file, preview }, idx) => (
                                <div key={preview} className="group relative aspect-square overflow-hidden rounded-xl border border-stroke bg-raised">
                                  <img src={preview} alt={file.name} className="h-full w-full object-cover" />
                                  {/* Order badge */}
                                  <span className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-[10px] font-bold text-white">
                                    {idx + 1}
                                  </span>
                                  {/* Remove button */}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); removeImageFile(idx); }}
                                    className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-all group-hover:opacity-100 hover:bg-red-600"
                                  >
                                    <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                  {/* Filename tooltip on hover */}
                                  <div className="absolute inset-x-0 bottom-0 truncate bg-black/60 px-1 py-0.5 text-center text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                                    {file.name}
                                  </div>
                                </div>
                              ))}
                              {/* Add more tile */}
                              <button
                                type="button"
                                onClick={() => imageInputRef.current?.click()}
                                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stroke bg-raised/40 text-ink4 transition-colors hover:border-emerald-500/50 hover:text-emerald-500"
                              >
                                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span className="text-[10px] font-medium">Add more</span>
                              </button>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <p className="text-[11px] text-ink4">
                                <CheckIcon className="mr-1 inline size-3 text-emerald-500" />
                                {imageFiles.length} image{imageFiles.length !== 1 ? "s" : ""} ready to upload · image #1 will be the cover
                              </p>
                              <button
                                type="button"
                                onClick={clearImageFiles}
                                className="text-[11px] text-ink4 transition-colors hover:text-red-400"
                              >
                                Clear all
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </FieldGroup>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-stroke" />

              {/* Pricing & inventory */}
              <div>
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-ink4">Pricing & inventory</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FieldGroup>
                    <label className={labelClass} htmlFor="c-price">Price ($) <span className="text-red-400">*</span></label>
                    <input
                      id="c-price"
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => patchForm({ price: e.target.value })}
                      className={inputClass}
                      placeholder="0.00"
                    />
                  </FieldGroup>

                  <FieldGroup>
                    <label className={labelClass} htmlFor="c-stock">Stock quantity</label>
                    <input
                      id="c-stock"
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock}
                      onChange={(e) => patchForm({ stock: e.target.value })}
                      className={inputClass}
                      placeholder="0"
                    />
                  </FieldGroup>

                  <FieldGroup>
                    <label className={labelClass} htmlFor="c-discount">Discount (%)</label>
                    <input
                      id="c-discount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={form.discount}
                      onChange={(e) => patchForm({ discount: e.target.value })}
                      className={inputClass}
                      placeholder="0"
                    />
                  </FieldGroup>
                </div>

                <div className="mt-4">
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stroke bg-raised px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-well w-fit">
                    <input
                      type="checkbox"
                      checked={form.availability}
                      onChange={(e) => patchForm({ availability: e.target.checked })}
                      className="h-4 w-4 rounded accent-emerald-500"
                    />
                    Available for purchase immediately
                  </label>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-stroke bg-well/40 px-4 py-3">
                <p className="text-xs text-ink4">
                  You can upload gallery images after creating the product.
                </p>
                <button
                  type="submit"
                  disabled={createMutation.isPending || createMutation.isSuccess}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? (
                    <>
                      <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      Creating…
                    </>
                  ) : (
                    <>
                      <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      Create product
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* ════════════════════════════════════════════════
            MANAGE PRODUCTS VIEW
        ════════════════════════════════════════════════ */}
        {view === "manage" && (
          <motion.div
            key="manage"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="p-6 space-y-5"
          >
            {productsQ.isError && (
              <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {productsQ.error instanceof Error ? productsQ.error.message : "Failed to load products"}
              </p>
            )}

            {/* Product selector */}
            <FieldGroup>
              <label className={labelClass} htmlFor="m-select">Select product</label>
              <select
                id="m-select"
                value={selected?.product_id ?? ""}
                onChange={(e) => onSelectProduct(e.target.value)}
                className={inputClass}
              >
                <option value="">— Choose a product to edit —</option>
                {products.map((p) => (
                  <option key={p.product_id} value={p.product_id}>
                    {p.name} · ${p.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </FieldGroup>

            {selected ? (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
                className="space-y-5"
              >
                {/* Product header */}
                <div className="flex flex-wrap items-start gap-4 rounded-xl border border-stroke bg-raised/40 p-4">
                  {productImage ? (
                    <img src={productImage} alt={selected.name} className="h-20 w-20 rounded-xl border border-stroke object-cover" />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-stroke bg-well">
                      <PackageIcon className="size-7 text-ink4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold text-ink">{selected.name}</p>
                    <p className="mt-0.5 text-xs text-ink4">ID: #{selected.product_id.slice(0, 8).toUpperCase()}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                        selected.availability
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}>
                        {selected.availability ? "In stock" : "Out of stock"}
                      </span>
                      {selected.brand && (
                        <span className="rounded-full border border-stroke bg-raised px-2.5 py-0.5 text-[10px] font-medium text-ink3">
                          {selected.brand}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold tabular-nums text-ink">${selected.price.toFixed(2)}</p>
                    {selected.stock != null && (
                      <p className="mt-0.5 text-xs text-ink4">{selected.stock} in stock</p>
                    )}
                  </div>
                </div>

                {/* Edit fields */}
                <div>
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-ink4">Edit product</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldGroup>
                        <label className={labelClass} htmlFor="m-name">Name</label>
                        <input id="m-name" value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} placeholder="Product name" />
                      </FieldGroup>
                    </div>

                    <div className="sm:col-span-2">
                      <FieldGroup>
                        <label className={labelClass} htmlFor="m-desc">Description</label>
                        <textarea id="m-desc" rows={4} value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className={`${inputClass} resize-y`} placeholder="Product description…" />
                      </FieldGroup>
                    </div>

                    <FieldGroup>
                      <label className={labelClass} htmlFor="m-price">Price ($)</label>
                      <input id="m-price" type="number" min="0.01" step="0.01" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} className={inputClass} placeholder="0.00" />
                    </FieldGroup>

                    <FieldGroup>
                      <label className={labelClass} htmlFor="m-brand">Brand</label>
                      <input id="m-brand" value={editBrand} onChange={(e) => setEditBrand(e.target.value)} className={inputClass} placeholder="Brand name" />
                    </FieldGroup>

                    <FieldGroup>
                      <label className={labelClass} htmlFor="m-stock">Stock</label>
                      <input id="m-stock" type="number" min="0" step="1" value={editStock} onChange={(e) => setEditStock(e.target.value)} className={inputClass} placeholder="0" />
                    </FieldGroup>

                    <FieldGroup>
                      <label className={labelClass} htmlFor="m-discount">Discount (%)</label>
                      <input id="m-discount" type="number" min="0" max="100" step="0.1" value={editDiscount} onChange={(e) => setEditDiscount(e.target.value)} className={inputClass} placeholder="0" />
                    </FieldGroup>

                    <div className="sm:col-span-2 flex items-center">
                      <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-stroke bg-raised px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-well w-fit">
                        <input type="checkbox" checked={editAvail} onChange={(e) => setEditAvail(e.target.checked)} className="h-4 w-4 rounded accent-emerald-500" />
                        Available for purchase
                      </label>
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                  >
                    {updateMutation.isPending ? "Saving…" : "Save changes"}
                  </button>
                  <ConfirmButton
                    onConfirm={() => deleteMutation.mutate()}
                    message="Delete this product? It may still be in active carts or orders."
                    confirmLabel="Yes, delete"
                    disabled={deleteMutation.isPending}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                  >
                    {deleteMutation.isPending ? "Deleting…" : "Delete product"}
                  </ConfirmButton>
                </div>

                {/* Gallery manager */}
                <div className="space-y-4 rounded-xl border border-stroke bg-raised p-4">
                  <div>
                    <p className="text-sm font-semibold text-ink">Gallery images</p>
                    <p className="text-xs text-ink4 mt-0.5">Remove existing images or upload new ones. JPG, PNG, WebP — max 5 MB each.</p>
                  </div>

                  {/* Current images */}
                  {(() => {
                    const existingImages: string[] = Array.isArray((selected as any).images)
                      ? (selected as any).images
                      : selected.image ? [selected.image] : [];
                    return existingImages.length > 0 ? (
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink4">Current images ({existingImages.length})</p>
                        <div className="flex flex-wrap gap-3">
                          {existingImages.map((img, idx) => (
                            <div key={img} className="group relative">
                              <img
                                src={getImageUrl(img) ?? ""}
                                alt={`Image ${idx + 1}`}
                                className="h-20 w-20 rounded-xl border border-stroke object-cover"
                              />
                              <span className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-[9px] font-bold text-white">
                                {idx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeExistingImageMutation.mutate(img)}
                                disabled={removeExistingImageMutation.isPending}
                                className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-red-600/90 text-white opacity-0 transition-opacity group-hover:opacity-100 disabled:cursor-not-allowed"
                                title="Remove image"
                              >
                                <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-ink4 italic">No images yet — upload some below.</p>
                    );
                  })()}

                  {/* Divider */}
                  <div className="border-t border-stroke" />

                  {/* New images drop zone */}
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-ink4">Add new images</p>
                    <input
                      ref={manageInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => { if (e.target.files) addManageFiles(Array.from(e.target.files)); e.target.value = ""; }}
                    />
                    <div
                      onClick={() => manageInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setManageDragging(true); }}
                      onDragLeave={() => setManageDragging(false)}
                      onDrop={handleManageDrop}
                      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
                        manageDragging
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-stroke bg-well/40 hover:border-emerald-500/50 hover:bg-emerald-500/5"
                      }`}
                    >
                      <CameraIcon className="size-7 text-ink4" />
                      <p className="text-xs text-ink4">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Click to browse</span> or drag & drop
                      </p>
                      <p className="text-[10px] text-ink4">JPG, PNG, WebP · up to 5 MB each</p>
                    </div>

                    {/* New image previews */}
                    <AnimatePresence>
                      {manageFiles.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-3 overflow-hidden"
                        >
                          <div className="flex flex-wrap gap-3">
                            {manageFiles.map(({ preview }, idx) => (
                              <div key={preview} className="group relative">
                                <img src={preview} alt="" className="h-20 w-20 rounded-xl border border-stroke object-cover" />
                                <span className="absolute left-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-[9px] font-bold text-white">
                                  {idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeManageFile(idx)}
                                  className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-red-600/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                  <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            {/* Add more tile */}
                            <button
                              type="button"
                              onClick={() => manageInputRef.current?.click()}
                              className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stroke bg-well/40 text-ink4 transition-colors hover:border-emerald-500/50 hover:text-emerald-500"
                            >
                              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              <span className="text-[10px] font-medium">Add more</span>
                            </button>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-xs text-ink4">{manageFiles.length} file{manageFiles.length !== 1 ? "s" : ""} ready to upload</p>
                            <button type="button" onClick={clearManageFiles} className="text-[11px] text-ink4 transition-colors hover:text-red-400">
                              Clear all
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={() => uploadManageImagesMutation.mutate()}
                    disabled={uploadManageImagesMutation.isPending || manageFiles.length === 0}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
                  >
                    {uploadManageImagesMutation.isPending ? (
                      <>
                        <svg className="size-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Uploading…
                      </>
                    ) : (
                      <>
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                        </svg>
                        Upload {manageFiles.length > 0 ? `${manageFiles.length} image${manageFiles.length !== 1 ? "s" : ""}` : "images"}
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="rounded-xl border border-stroke bg-raised p-10 text-center">
                <PackageIcon className="mx-auto size-10 text-ink4" />
                <p className="mt-3 text-sm font-medium text-ink3">Select a product above to edit it</p>
                <p className="mt-1 text-xs text-ink4">Or switch to the <strong>New product</strong> tab to add one.</p>
              </div>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </section>
    </>
  );
}
