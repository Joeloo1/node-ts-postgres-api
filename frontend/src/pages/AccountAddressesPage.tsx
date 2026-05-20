import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { usePageTitle } from "../hooks/usePageTitle";
import { ApiError, apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { AccountAddressesSkeleton } from "../components/ProductSkeleton";
import type { Address } from "../lib/types";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-600 transition-colors";

type AddressesRes = {
  status: string;
  data: { address: Address[] };
};

type CreateAddressRes = {
  status: string;
  data: { Address: Address };
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
      setStreet("");
      setCity("");
      setState("");
      setZipCode("");
      setCountry("");
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
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <p className="text-sm text-red-400">
          {addressesQuery.error instanceof Error
            ? addressesQuery.error.message
            : "Failed to load addresses"}
        </p>
      </section>
    );
  }

  if (addressesQuery.isPending) return <AccountAddressesSkeleton />;

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
      <h2 className="font-display text-lg font-semibold text-white">Addresses</h2>

      <ul className="mt-4 space-y-3">
        {addressesQuery.data?.map((a) => (
          <li
            key={a.id}
            className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/50 p-4"
          >
            <div className="text-sm text-zinc-300">
              <p className="font-medium">{a.street}</p>
              <p className="text-zinc-500">
                {a.city}
                {a.state ? `, ${a.state}` : ""} {a.zipCode ?? ""}
              </p>
              {a.country && <p className="text-zinc-500">{a.country}</p>}
            </div>
            <button
              type="button"
              onClick={() => onDelete(a.id)}
              disabled={deleteAddress.isPending}
              className="rounded-lg border border-red-800/50 bg-red-950/20 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40 disabled:opacity-50 transition-colors"
            >
              Remove
            </button>
          </li>
        ))}
        {addressesQuery.data?.length === 0 && (
          <p className="py-4 text-center text-sm text-zinc-500">No saved addresses yet.</p>
        )}
      </ul>

      <form onSubmit={onAddAddress} className="mt-8 space-y-3 border-t border-zinc-800 pt-8">
        <h3 className="text-sm font-medium text-white">Add address</h3>
        <input
          required
          minLength={2}
          placeholder="Street"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className={inputClass}
        />
        <input
          required
          minLength={2}
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={inputClass}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="State (optional)"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="ZIP (optional)"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className={inputClass}
          />
          <input
            placeholder="Country (optional)"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={createAddress.isPending}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {createAddress.isPending ? "Saving…" : "Save address"}
        </button>
      </form>
    </section>
  );
}
