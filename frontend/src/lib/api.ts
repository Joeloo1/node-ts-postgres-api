export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function baseUrl(): string {
  const env = import.meta.env.VITE_API_URL;
  return typeof env === "string" && env.length > 0 ? env.replace(/\/$/, "") : "";
}

// ── Silent token refresh ──────────────────────────────────────────────────────
// Shared promise so concurrent 401s only trigger one refresh call (thundering-herd guard).
let refreshing: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (refreshing) return refreshing;

  refreshing = fetch(`${baseUrl()}/api/v1/users/refresh`, {
    method: "GET",
    credentials: "include",
  })
    .then((r) => r.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });

  return refreshing;
}
// ─────────────────────────────────────────────────────────────────────────────

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth: _auth, headers: initHeaders, ...rest } = init;
  const headers = new Headers(initHeaders);

  if (!headers.has("Content-Type") && rest.body && !(rest.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${baseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  let res: Response;

  try {
    res = await fetch(url, { ...rest, headers, credentials: "include" });
  } catch {
    throw new ApiError(0, "Network error. Please check your connection and try again.");
  }

  // ── Auto-refresh on 401 ──────────────────────────────────────────────────
  // Don't try to refresh if this IS the refresh endpoint (avoids infinite loop).
  if (res.status === 401 && !path.includes("/refresh")) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry the original request once with the new access-token cookie
      try {
        res = await fetch(url, { ...rest, headers, credentials: "include" });
      } catch {
        throw new ApiError(0, "Network error. Please check your connection and try again.");
      }
    }
    // If refresh failed or the retry is still 401, fall through to error handling below.
  }
  // ────────────────────────────────────────────────────────────────────────

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
