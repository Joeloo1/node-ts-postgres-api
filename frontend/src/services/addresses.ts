import { apiFetch } from "../lib/http";
import type { Address } from "../lib/types";

type AddressesRes = { status: string; data: { address: Address[] } };
type CreateRes    = { status: string; data: { Address: Address } };

export async function getAddresses(): Promise<Address[]> {
  const res = await apiFetch<AddressesRes>("/api/v1/users/address", { auth: true });
  return res.data.address;
}

export async function createAddress(
  data: Omit<Address, "id">,
): Promise<Address> {
  const res = await apiFetch<CreateRes>("/api/v1/users/address", {
    method: "POST",
    auth: true,
    body: JSON.stringify(data),
  });
  return res.data.Address;
}

export async function deleteAddress(id: string): Promise<void> {
  await apiFetch(`/api/v1/users/address/${id}`, { method: "DELETE", auth: true });
}
