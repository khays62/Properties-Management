import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { AuthRouteLoading } from "./AuthRouteLoading";
import { getSafeRedirectPath } from "./routeState";

export interface GuestRouteProps {
  children?: ReactNode;
}

export function GuestRoute({ children }: GuestRouteProps) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === "loading") return <AuthRouteLoading />;
  if (status === "authenticated" && user) {
    return (
      <Navigate
        to={getSafeRedirectPath(location.state)}
        replace
      />
    );
  }

  return children !== undefined ? children : <Outlet />;
}
