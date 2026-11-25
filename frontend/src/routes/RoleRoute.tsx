import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import type { UserRole } from "../types/auth";
import { AuthRouteLoading } from "./AuthRouteLoading";

export interface RoleRouteProps {
  allowedRoles: readonly UserRole[];
  children?: ReactNode;
}

export function RoleRoute({
  allowedRoles,
  children,
}: RoleRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") return <AuthRouteLoading />;
  if (status !== "authenticated" || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (!user.role || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children !== undefined ? children : <Outlet />;
}
