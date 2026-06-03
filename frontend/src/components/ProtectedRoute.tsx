import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./Spinner";

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  // Wait for the /me query to finish before making any auth decision.
  // Without this, token is null during loading and we redirect too early.
  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-zinc-400">
        <Spinner />
        <p className="text-sm">Checking your session…</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
