import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "../lib/api";
import type { User } from "../lib/types";

type AuthResponse = {
  status: string;
  data: { user: User };
};

type MeResponse = {
  status: string;
  data: User;
};

type AuthContextValue = {
  user: User | null;
  /** Opaque session indicator — truthy when logged in, null when not. Never a raw JWT. */
  token: string | null;
  isLoading: boolean;
  profileError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    passwordConfirm: string;
    phoneNumber?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const {
    data: user,
    isPending,
    isError,
    error: meQueryError,
  } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        const res = await apiFetch<MeResponse>("/api/v1/users/me");
        return (res.data as User) ?? null;
      } catch (err) {
        // 401 = not logged in — treat as null, not an error state
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });

  const profileError =
    isError && meQueryError instanceof Error
      ? meQueryError.message
      : isError
        ? "Could not load your profile."
        : null;

  const login = useCallback(
    async (email: string, password: string) => {
      await apiFetch<AuthResponse>("/api/v1/users/Login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      // Cookie is set by the server — just refresh the /me query
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      passwordConfirm: string;
      phoneNumber?: string;
    }) => {
      await apiFetch<AuthResponse>("/api/v1/users/Signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/api/v1/users/Logout", { method: "POST" });
    } catch {
      // best-effort: always clear local state
    }
    queryClient.setQueryData(["me"], null);
    queryClient.removeQueries({ queryKey: ["cart"] });
  }, [queryClient]);

  const resolvedUser = user ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user: resolvedUser,
      // Expose an opaque non-null string when authenticated so existing
      // Boolean(token) guards continue to work without holding the raw JWT.
      token: resolvedUser ? "session" : null,
      isLoading: isPending,
      profileError,
      login,
      register,
      logout,
    }),
    [resolvedUser, isPending, profileError, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
