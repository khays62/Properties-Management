import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import axios from "axios";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./app/AuthProvider";
import { AppShell } from "./layouts/AppShell";
import { DashboardRoute } from "./features/dashboard/routes/DashboardRoute";
import {
  ApplicationsPage,
  FinancePage,
  LeasesPage,
  ListingsPage,
  MaintenancePage,
  PropertiesPage,
  PublicListingsPage,
  RenewalsPage,
  UnitsPage,
} from "./features/workflows/pages";
import { LoginPage } from "./pages/LoginPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import {
  AuthenticatedRoute,
  GuestRoute,
  RoleRoute,
} from "./routes";
import { USER_ROLES } from "./types/auth";
import type { UserRole } from "./types/auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (axios.isAxiosError(error) && error.response) {
          return error.response.status >= 500 && failureCount < 1;
        }

        return failureCount < 1;
      },
      staleTime: 30_000,
    },
  },
});

const MANAGEMENT_ROLES: UserRole[] = ["OWNER", "PROPERTY_MANAGER"];
const FINANCE_ROLES: UserRole[] = [
  "OWNER",
  "PROPERTY_MANAGER",
  "ACCOUNTANT",
  "TENANT",
];
const MAINTENANCE_ROLES: UserRole[] = [
  "OWNER",
  "PROPERTY_MANAGER",
  "TENANT",
];
const RENEWAL_ROLES: UserRole[] = ["OWNER", "PROPERTY_MANAGER", "TENANT"];

function WorkflowRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: readonly UserRole[];
  children: ReactNode;
}) {
  return (
    <AuthenticatedRoute>
      <RoleRoute allowedRoles={allowedRoles}>
        <AppShell>{children}</AppShell>
      </RoleRoute>
    </AuthenticatedRoute>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route
              path="/dashboard"
              element={
                <AuthenticatedRoute>
                  <RoleRoute allowedRoles={USER_ROLES}>
                    <AppShell>
                      <DashboardRoute />
                    </AppShell>
                  </RoleRoute>
                </AuthenticatedRoute>
              }
            />
            <Route
              path="/properties"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <PropertiesPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/units"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <UnitsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/listings"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <ListingsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/applications"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <ApplicationsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/leases"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <LeasesPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/finance"
              element={
                <WorkflowRoute allowedRoles={FINANCE_ROLES}>
                  <FinancePage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/maintenance"
              element={
                <WorkflowRoute allowedRoles={MAINTENANCE_ROLES}>
                  <MaintenancePage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/renewals"
              element={
                <WorkflowRoute allowedRoles={RENEWAL_ROLES}>
                  <RenewalsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/available-listings"
              element={<PublicListingsPage />}
            />
            <Route
              path="/"
              element={<Navigate to="/dashboard" replace />}
            />
            <Route
              path="*"
              element={<Navigate to="/dashboard" replace />}
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
