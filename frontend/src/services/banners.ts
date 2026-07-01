import { apiFetch } from "../lib/api";

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  position: string;
  order: number;
}

export async function getBanners(position: string): Promise<Banner[]> {
  const res = await apiFetch<{ data: Banner[] }>(`/api/v1/banners?position=${encodeURIComponent(position)}`);
  return res.data ?? [];
}
