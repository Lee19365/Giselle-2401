
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "../features/auth/authStore";
import { LoadingScreen } from "./LoadingScreen";

interface ProtectedRouteProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const session = useAuthStore((state) => state.session);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

