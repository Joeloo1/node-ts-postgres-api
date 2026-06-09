import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Spinner } from "./Spinner";

export function AdminRoute({ children }: { children: ReactNode }) {
  const { token, user, isLoading } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 text-zinc-400">
        <Spinner />
        <p className="text-sm">Checking your session…</p>
      </div>
    );
  }

  if (!user || user.roles !== "ADMIN") {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}

