import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AccountAddressesSkeleton } from "../components/ProductSkeleton";
import { MapPinIcon, PlusIcon, TrashIcon } from "../components/Icons";
import type { Address } from "../lib/types";

const inputClass =
  "w-full rounded-xl border border-stroke bg-input px-4 py-2.5 text-sm text-ink placeholder:text-ink4 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-600/80 transition-colors";

const labelClass = "mb-1.5 block text-xs font-medium text-ink3";

type AddressesRes = { status: string; data: { address: Address[] } };
type CreateAddressRes = { status: string; data: { Address: Address } };

const card = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: i * 0.09, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

const listItem = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.2 } },
};

export function AccountAddressesPage() {
  usePageTitle("Addresses");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("");

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
          street,
          city,
          state: state.trim() || undefined,
          zipCode: zipCode.trim() || undefined,
          country: country.trim() || undefined,
        }),
      });
      return res;
    },
    onSuccess: () => {
      setStreet(""); setCity(""); setState(""); setZipCode(""); setCountry("");
      toast.success("Address saved.");
      queryClient.invalidateQueries({ queryKey: ["addresses"] });
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Could not save address"),
  });

  function onAddAddress(e: FormEvent) {
    e.preventDefault();
    createAddress.mutate();
  }

  function onDelete(id: string) {
    if (!window.confirm("Remove this address?")) return;
    deleteAddress.mutate(id);
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

  return (
    <div className="space-y-5">

      {/* ── Saved addresses ──────────────────────── */}
      <motion.section
        custom={0}
        variants={card}
        initial="hidden"
        animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="flex items-center gap-3 border-b border-stroke px-6 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <MapPinIcon className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">Saved Addresses</h2>
            <p className="text-xs text-ink4">
              {addressesQuery.data?.length === 0
                ? "No addresses saved yet"
                : `${addressesQuery.data?.length} address${(addressesQuery.data?.length ?? 0) > 1 ? "es" : ""} saved`}
            </p>
          </div>
        </div>

        <div className="p-4">
          {addressesQuery.data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-well text-ink4">
                <MapPinIcon className="size-6" />
              </div>
              <p className="text-sm text-ink4">No saved addresses yet.</p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              <ul className="space-y-2.5">
                {addressesQuery.data?.map((a) => (
                  <motion.li
                    key={a.id}
                    variants={listItem}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    layout
                    className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-stroke bg-card px-4 py-3.5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-well text-ink3">
                        <MapPinIcon className="size-3.5" />
                      </div>
                      <div className="text-sm text-ink2">
                        <p className="font-medium text-ink">{a.street}</p>
                        <p className="mt-0.5 text-ink4">
                          {a.city}{a.state ? `, ${a.state}` : ""} {a.zipCode ?? ""}
                        </p>
                        {a.country && <p className="text-ink4">{a.country}</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDelete(a.id)}
                      disabled={deleteAddress.isPending}
                      className="flex items-center gap-1.5 rounded-lg border border-red-800/40 bg-red-950/20 px-2.5 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950/50 disabled:opacity-50"
                    >
                      <TrashIcon className="size-3.5" />
                      Remove
                    </button>
                  </motion.li>
                ))}
              </ul>
            </AnimatePresence>
          )}
        </div>
      </motion.section>

      {/* ── Add address ──────────────────────────── */}
      <motion.section
        custom={1}
        variants={card}
        initial="hidden"
        animate="show"
        className="overflow-hidden rounded-2xl border border-stroke bg-card"
      >
        <div className="flex items-center gap-3 border-b border-stroke px-6 py-4">
          <div className="flex size-8 items-center justify-center rounded-lg bg-well text-ink3">
            <PlusIcon className="size-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">Add Address</h2>
            <p className="text-xs text-ink4">Save a new delivery address</p>
          </div>
        </div>

        <form onSubmit={onAddAddress} className="space-y-4 p-6">
          <div>
            <label className={labelClass}>Street address</label>
            <input
              required
              minLength={2}
              placeholder="123 Main St"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>City</label>
            <input
              required
              minLength={2}
              placeholder="New York"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>State <span className="text-ink4">(optional)</span></label>
              <input
                placeholder="NY"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>ZIP <span className="text-ink4">(optional)</span></label>
              <input
                placeholder="10001"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country <span className="text-ink4">(optional)</span></label>
              <input
                placeholder="United States"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="pt-1">
            <button
              type="submit"
              disabled={createAddress.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
            >
              {createAddress.isPending ? (
                <>
                  <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <PlusIcon className="size-4" />
                  Save address
                </>
              )}
            </button>
          </div>
        </form>
      </motion.section>
    </div>
  );
}
