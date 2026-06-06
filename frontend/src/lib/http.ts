import { ApiError } from "./errors";
import { getAuthToken, setAuthToken } from "./auth-token";

function baseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  return typeof env === "string" && env.length > 0 ? env.replace(/\/$/, "") : "";
}

let refreshing: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshing) return refreshing;

  refreshing = fetch(`${baseUrl()}/api/v1/users/refresh`, {
    method: "GET",
    credentials: "include",
  })
    .then(async (r) => {
      if (!r.ok) return false;
      const data = await r.json().catch(() => null);
      const token = data?.token ?? data?.accessToken;
      if (typeof token === "string") setAuthToken(token);
      return true;
    })
    .catch(() => false)
    .finally(() => { refreshing = null; });

  return refreshing;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth: _auth, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);

  if (!headers.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const token = getAuthToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  let res: Response;

  try {
    res = await fetch(url, { ...rest, headers, credentials: "include" });
  } catch {
    throw new ApiError(0, "Network error. Please check your connection and try again.");
  }

  if (res.status === 401 && !path.includes("/refresh")) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      const newToken = getAuthToken();
      if (newToken) headers.set("Authorization", `Bearer ${newToken}`);
      try {
        res = await fetch(url, { ...rest, headers, credentials: "include" });
      } catch {
        throw new ApiError(0, "Network error. Please check your connection and try again.");
      }
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch {
      if (!res.ok) throw new ApiError(res.status, `Request failed (${res.status})`);
      return undefined as T;
    }
  }

  if (!res.ok) {
    const msg =
      typeof data.message === "string" ? data.message : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }

  return data as T;
}
