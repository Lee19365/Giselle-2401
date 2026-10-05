import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuthStore } from "../features/auth/authStore";
import { LoadingScreen } from "./LoadingScreen";

interface PublicRouteProps {
  children: ReactNode;
}

export function PublicRoute({ children }: PublicRouteProps) {
  const session = useAuthStore((state) => state.session);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);

  // Esperamos a que Zustand recupere la sesión guardada.
  // Así evitamos redirigir antes de conocer el estado real del usuario.
  if (!hasHydrated) {
    return <LoadingScreen />;
  }

  // Si ya existe una sesión, el usuario no necesita acceder
  // nuevamente al login o registro.
  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  // No hay sesión, por lo que las rutas públicas pueden mostrarse.
  return <>{children}</>;
}
