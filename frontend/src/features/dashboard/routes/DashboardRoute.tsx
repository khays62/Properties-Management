import { Navigate } from "react-router-dom";

import { useAuth } from "../../../hooks/useAuth";
import {
  AccountantDashboard,
  OwnerDashboard,
  PropertyManagerDashboard,
  TenantDashboard,
} from "../pages";

export function DashboardRoute() {
  const { user } = useAuth();

  switch (user?.role) {
    case "OWNER":
      return <OwnerDashboard />;
    case "PROPERTY_MANAGER":
      return <PropertyManagerDashboard />;
    case "ACCOUNTANT":
      return <AccountantDashboard />;
    case "TENANT":
      return <TenantDashboard />;
    default:
      return <Navigate to="/unauthorized" replace />;
  }
}
