import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AccountAddressesSkeleton } from "../components/ProductSkeleton";
import { MapPinIcon, PencilIcon, PlusIcon, TrashIcon, XIcon } from "../components/Icons";
import { ConfirmButton } from "../components/ConfirmButton";
import type { Address } from "../lib/types";

const inputClass =
  "w-full rounded-xl border border-stroke bg-input px-4 py-2.5 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600/80 transition-colors";
const labelClass = "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink4";

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Netherlands", "Sweden", "Norway", "Denmark", "Switzerland",
  "Spain", "Italy", "Portugal", "Poland", "Ireland", "New Zealand",
  "Japan", "South Korea", "Singapore", "India", "China", "Brazil",
  "Mexico", "Argentina", "South Africa", "Nigeria", "Kenya",
  "United Arab Emirates", "Saudi Arabia", "Turkey",
];

type AddressesRes   = { status: string; data: { address: Address[] } };
type CreateAddressRes = { status: string; data: { Address: Address } };

const MAX_ADDRESSES = 5;

const card = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.35, delay: i * 0.09, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};
const listItem = {
  hidden: { opacity: 0, x: -12 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
  exit:   { opacity: 0, x: 12, transition: { duration: 0.2 } },
};

type EditState = {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
};

function emptyEdit(): EditState {
  return { street: "", city: "", state: "", zipCode: "", country: "" };
}

export function AccountAddressesPage() {
  usePageTitle("Addresses");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddr, setNewAddr] = useState<EditState>(emptyEdit());
  const [newCountryIsOther, setNewCountryIsOther] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditState>(emptyEdit());
  const [editCountryIsOther, setEditCountryIsOther] = useState(false);

  const addressesQuery = useQuery({
    queryKey: ["addresses", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const res = await apiFetch<AddressesRes>("/api/v1/addresses", { auth: true });
      const raw = res.data.address;
      return Array.isArray(raw) ? raw : [];
    },
  });

  const deleteAddress = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/v1/addresses/${id}`, { method: "DELETE", auth: true });
    },
    onSuccess: () => {
      toast.success("Address removed.");
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not delete address"),
  });

  const createAddress = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<CreateAddressRes>("/api/v1/addresses", {
        method: "POST",
        auth: true,
        body: JSON.stringify({
          street:  newAddr.street,
          city:    newAddr.city,
          state:   newAddr.state.trim()   || undefined,
          zipCode: newAddr.zipCode.trim() || undefined,
          country: newAddr.country.trim() || undefined,
        }),
      });
      return res;
    },
    onSuccess: () => {
      setNewAddr(emptyEdit());
      setNewCountryIsOther(false);
      setShowAddForm(false);
      toast.success("Address saved.");
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not save address"),
  });

  const updateAddress = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/v1/addresses/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({
          street:  editValues.street,
          city:    editValues.city,
          state:   editValues.state.trim()   || undefined,
          zipCode: editValues.zipCode.trim() || undefined,
          country: editValues.country.trim() || undefined,
        }),
      });
    },
    onSuccess: () => {
      setEditingId(null);
      toast.success("Address updated.");
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not update address"),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      await apiFetch(`/api/v1/addresses/${id}`, {
        method: "PATCH",
        auth: true,
        body: JSON.stringify({ isDefault: true }),
      });
    },
    onSuccess: () => {
      toast.success("Default address updated.");
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not set default"),
  });

  function startEdit(a: Address) {
    const country = a.country ?? "";
    const isOther = country !== "" && !COUNTRIES.includes(country);
    setEditCountryIsOther(isOther);
    setEditingId(a.id);
    setEditValues({
      street:  a.street,
      city:    a.city,
      state:   a.state   ?? "",
      zipCode: a.zipCode ?? "",
      country,
    });
  }

  function onAddAddress(e: FormEvent) {
    e.preventDefault();
    createAddress.mutate();
  }

  function onUpdateAddress(e: FormEvent, id: string) {
    e.preventDefault();
    updateAddress.mutate(id);
  }

  if (addressesQuery.isError) {
    return (
      <section className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6">
        <p className="text-sm text-red-400">
          {addressesQuery.error instanceof Error ? addressesQuery.error.message : "Failed to load addresses"}
        </p>
      </section>
    );
  }

  if (addressesQuery.isPending) return <AccountAddressesSkeleton />;

  const addresses = addressesQuery.data ?? [];
  const atLimit = addresses.length >= MAX_ADDRESSES;

  return (
    <div className="space-y-5">

      {/* Saved addresses */}
      <motion.section
        custom={0} variants={card} initial="hidden" animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="flex items-center justify-between border-b border-stroke px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Saved addresses</h2>
            <p className="mt-0.5 text-xs text-ink4">
              {addresses.length === 0
                ? "No addresses saved yet."
                : `${addresses.length} of ${MAX_ADDRESSES} addresses saved.`}
            </p>
          </div>
          {!atLimit && (
            <button
              type="button"
              onClick={() => { setShowAddForm((v) => !v); }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                showAddForm
                  ? "border-stroke bg-raised text-ink"
                  : "border-emerald-500/25 bg-emerald-500/8 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400"
              }`}
            >
              {showAddForm ? (
                <><XIcon className="size-3.5" /> Cancel</>
              ) : (
                <><PlusIcon className="size-3.5" /> Add address</>
              )}
            </button>
          )}
        </div>

        {/* Address list */}
        <div className="divide-y divide-stroke">
          {addresses.length === 0 && !showAddForm ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-well text-ink4">
                <MapPinIcon className="size-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">No saved addresses</p>
                <p className="mt-1 text-xs text-ink4">Add a delivery address to speed up checkout.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
              >
                <PlusIcon className="size-3.5" />
                Add your first address
              </button>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {addresses.map((a) => (
                <motion.div
                  key={a.id}
                  variants={listItem}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  layout
                >
                  {editingId === a.id ? (
                    /* Inline edit form */
                    <form
                      onSubmit={(e) => onUpdateAddress(e, a.id)}
                      className="space-y-4 bg-well/30 px-6 py-5"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-ink">Edit address</p>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-ink4 transition-colors hover:text-ink"
                          aria-label="Cancel edit"
                        >
                          <XIcon className="size-4" />
                        </button>
                      </div>
                      <div>
                        <label className={labelClass}>Street address</label>
                        <input required value={editValues.street} onChange={(e) => setEditValues((v) => ({ ...v, street: e.target.value }))} className={inputClass} placeholder="123 Main St" />
                      </div>
                      <div>
                        <label className={labelClass}>City</label>
                        <input required value={editValues.city} onChange={(e) => setEditValues((v) => ({ ...v, city: e.target.value }))} className={inputClass} placeholder="New York" />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className={labelClass}>State</label>
                          <input value={editValues.state} onChange={(e) => setEditValues((v) => ({ ...v, state: e.target.value }))} className={inputClass} placeholder="NY" />
                        </div>
                        <div>
                          <label className={labelClass}>ZIP</label>
                          <input value={editValues.zipCode} onChange={(e) => setEditValues((v) => ({ ...v, zipCode: e.target.value }))} className={inputClass} placeholder="10001" />
                        </div>
                        <div>
                          <label className={labelClass}>Country</label>
                          <select
                            value={editCountryIsOther ? "__other__" : editValues.country}
                            onChange={(e) => {
                              if (e.target.value === "__other__") {
                                setEditCountryIsOther(true);
                                setEditValues((v) => ({ ...v, country: "" }));
                              } else {
                                setEditCountryIsOther(false);
                                setEditValues((v) => ({ ...v, country: e.target.value }));
                              }
                            }}
                            className={inputClass}
                          >
                            <option value="">Select country…</option>
                            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            <option value="__other__">Other…</option>
                          </select>
                          {editCountryIsOther && (
                            <input
                              className={`${inputClass} mt-2`}
                              placeholder="Enter your country"
                              value={editValues.country}
                              onChange={(e) => setEditValues((v) => ({ ...v, country: e.target.value }))}
                            />
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-ink3 transition-colors hover:bg-raised"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={updateAddress.isPending}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {updateAddress.isPending ? (
                            <>
                              <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                              Saving…
                            </>
                          ) : "Save changes"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    /* Address display */
                    <div className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-ink3 ${a.isDefault ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-well"}`}>
                          <MapPinIcon className="size-4" />
                        </div>
                        <div className="text-sm">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-ink">{a.street}</p>
                            {a.isDefault && (
                              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-ink4">
                            {a.city}{a.state ? `, ${a.state}` : ""} {a.zipCode ?? ""}
                          </p>
                          {a.country && <p className="text-ink4">{a.country}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!a.isDefault && (
                          <button
                            type="button"
                            onClick={() => setDefault.mutate(a.id)}
                            disabled={setDefault.isPending || (editingId !== null && editingId !== a.id)}
                            className="flex items-center gap-1.5 rounded-lg border border-stroke bg-card px-2.5 py-1.5 text-xs font-medium text-ink4 transition-colors hover:border-emerald-500/25 hover:bg-emerald-500/8 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:text-emerald-400"
                          >
                            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                            </svg>
                            Set default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(a)}
                          disabled={editingId !== null && editingId !== a.id}
                          className="flex items-center gap-1.5 rounded-lg border border-stroke bg-card px-2.5 py-1.5 text-xs font-medium text-ink3 transition-colors hover:bg-raised hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <PencilIcon className="size-3.5" />
                          Edit
                        </button>
                        <ConfirmButton
                          onConfirm={() => deleteAddress.mutate(a.id)}
                          message="Remove this address?"
                          confirmLabel="Remove"
                          disabled={deleteAddress.isPending || (editingId !== null && editingId !== a.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/8 px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/15 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
                        >
                          <TrashIcon className="size-3.5" />
                          Remove
                        </ConfirmButton>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}

          {/* Add address form (inline) */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <form onSubmit={onAddAddress} className="space-y-4 bg-well/30 px-6 py-5">
                  <p className="text-xs font-semibold text-ink">New address</p>
                  <div>
                    <label className={labelClass}>Street address</label>
                    <input
                      required minLength={2}
                      placeholder="123 Main St"
                      value={newAddr.street}
                      onChange={(e) => setNewAddr((v) => ({ ...v, street: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      required minLength={2}
                      placeholder="New York"
                      value={newAddr.city}
                      onChange={(e) => setNewAddr((v) => ({ ...v, city: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className={labelClass}>State <span className="text-ink4">(opt)</span></label>
                      <input
                        placeholder="NY"
                        value={newAddr.state}
                        onChange={(e) => setNewAddr((v) => ({ ...v, state: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>ZIP <span className="text-ink4">(opt)</span></label>
                      <input
                        placeholder="10001"
                        value={newAddr.zipCode}
                        onChange={(e) => setNewAddr((v) => ({ ...v, zipCode: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Country <span className="text-ink4">(opt)</span></label>
                      <select
                        value={newCountryIsOther ? "__other__" : newAddr.country}
                        onChange={(e) => {
                          if (e.target.value === "__other__") {
                            setNewCountryIsOther(true);
                            setNewAddr((v) => ({ ...v, country: "" }));
                          } else {
                            setNewCountryIsOther(false);
                            setNewAddr((v) => ({ ...v, country: e.target.value }));
                          }
                        }}
                        className={inputClass}
                      >
                        <option value="">Select country…</option>
                        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        <option value="__other__">Other…</option>
                      </select>
                      {newCountryIsOther && (
                        <input
                          className={`${inputClass} mt-2`}
                          placeholder="Enter your country"
                          value={newAddr.country}
                          onChange={(e) => setNewAddr((v) => ({ ...v, country: e.target.value }))}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => { setShowAddForm(false); setNewAddr(emptyEdit()); setNewCountryIsOther(false); }}
                      className="rounded-lg border border-stroke px-3 py-1.5 text-xs font-medium text-ink3 transition-colors hover:bg-raised"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={createAddress.isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {createAddress.isPending ? (
                        <>
                          <svg className="size-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                          </svg>
                          Saving…
                        </>
                      ) : (
                        <><PlusIcon className="size-3.5" /> Save address</>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {atLimit && (
          <div className="border-t border-stroke bg-well/30 px-6 py-3">
            <p className="text-xs text-ink4">
              You've reached the maximum of {MAX_ADDRESSES} saved addresses. Remove one to add another.
            </p>
          </div>
        )}
      </motion.section>
    </div>
  );
}
