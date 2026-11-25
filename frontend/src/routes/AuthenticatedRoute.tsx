import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { AuthRouteLoading } from "./AuthRouteLoading";

export interface AuthenticatedRouteProps {
  children?: ReactNode;
}

export function AuthenticatedRoute({
  children,
}: AuthenticatedRouteProps) {
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

  return children !== undefined ? children : <Outlet />;
}
