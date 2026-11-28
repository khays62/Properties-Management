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
import { ToastProvider } from "./components/feedback/ToastProvider";
import { AppShell } from "./layouts/AppShell";
import { MarketplaceLayout } from "./features/marketplace/components/MarketplaceLayout";
import {
  ApplicationSuccessPage,
  HomePage,
  PublicApplicationPage,
  PublicListingDetailsPage,
  PublicListingsPage,
} from "./features/marketplace/pages";
import { DashboardRoute } from "./features/dashboard/routes/DashboardRoute";
import {
  PropertyDetailsPage,
  PropertyListPage,
} from "./features/properties/pages";
import {
  UnitDetailsPage,
  UnitListPage,
} from "./features/units/pages";
import {
  ListingDetailsPage,
  ListingListPage,
} from "./features/listings/pages";
import {
  ApplicationDetailsPage,
  ApplicationListPage,
} from "./features/applications/pages";
import {
  LeaseDetailsPage,
  LeaseListPage,
} from "./features/leases/pages";
import {
  RenewalAlertDetailsPage,
  RenewalAlertListPage,
} from "./features/renewals/pages";
import {
  ChargeDetailsPage,
  ChargeListPage,
  DepositDetailsPage,
  DepositListPage,
  PaymentDetailsPage,
  PaymentListPage,
  RentScheduleListPage,
  ReceiptDetailsPage,
  ReceiptListPage,
} from "./features/finance/pages";
import {
  MaintenanceDetailsPage,
  MaintenanceListPage,
} from "./features/maintenance/pages";
import { NotificationListPage } from "./features/notifications/pages";
import {
  TeamInvitationAcceptPage,
  TeamListPage,
  TeamMemberDetailsPage,
} from "./features/team/pages";
import {
  ApplicationsPage,
  FinancePage,
  LeasesPage,
  ListingsPage,
  MaintenancePage,
  PropertiesPage,
  RenewalsPage,
  UnitsPage,
} from "./features/workflows/pages";
import { LoginPage } from "./pages/LoginPage";
import { TenantPasswordSetupPage } from "./pages/TenantPasswordSetupPage";
import { UnauthorizedPage } from "./pages/UnauthorizedPage";
import {
  AuthenticatedRoute,
  GuestRoute,
  RoleRoute,
} from "./routes";
import { useAuth } from "./hooks/useAuth";
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
const FINANCE_MANAGEMENT_ROLES: UserRole[] = [
  "OWNER",
  "PROPERTY_MANAGER",
  "ACCOUNTANT",
];
const MAINTENANCE_ROLES: UserRole[] = [
  "OWNER",
  "PROPERTY_MANAGER",
  "TENANT",
];
const RENEWAL_ROLES: UserRole[] = ["OWNER", "PROPERTY_MANAGER", "TENANT"];
const LEASE_ROLES: UserRole[] = ["OWNER", "PROPERTY_MANAGER", "TENANT"];

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

function ListingsRoute({ details = false }: { details?: boolean }) {
  const { user } = useAuth();

  const isManager = user?.role === "OWNER" || user?.role === "PROPERTY_MANAGER";
  if (isManager) {
    return (
      <AppShell>
        {details ? <ListingDetailsPage /> : <ListingListPage />}
      </AppShell>
    );
  }

  return (
    <MarketplaceLayout>
      {details ? <PublicListingDetailsPage /> : <PublicListingsPage />}
    </MarketplaceLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
      >
        <AuthProvider>
          <ToastProvider />
          <Routes>
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <LoginPage />
                </GuestRoute>
              }
            />
            <Route
              path="/set-password"
              element={<TenantPasswordSetupPage />}
            />
            <Route
              path="/team/accept-invitation"
              element={<TeamInvitationAcceptPage />}
            />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route
              path="/applications/success"
              element={
                <MarketplaceLayout>
                  <ApplicationSuccessPage />
                </MarketplaceLayout>
              }
            />
            <Route
              path="/listings/:listingId/apply"
              element={
                <MarketplaceLayout>
                  <PublicApplicationPage />
                </MarketplaceLayout>
              }
            />
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
              path="/notifications"
              element={
                <WorkflowRoute allowedRoles={USER_ROLES}>
                  <NotificationListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/team"
              element={
                <WorkflowRoute allowedRoles={["OWNER"]}>
                  <TeamListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/team/:memberId"
              element={
                <WorkflowRoute allowedRoles={["OWNER"]}>
                  <TeamMemberDetailsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/properties"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <PropertyListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/properties/:propertyId"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <PropertyDetailsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/units"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <UnitListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/units/:unitId"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <UnitDetailsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/listings"
              element={<ListingsRoute />}
            />
            <Route
              path="/listings/:listingId"
              element={<ListingsRoute details />}
            />
            <Route
              path="/applications"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <ApplicationListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/applications/:applicationId"
              element={
                <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                  <ApplicationDetailsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/leases"
              element={
                <WorkflowRoute allowedRoles={LEASE_ROLES}>
                  <LeaseListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/leases/:leaseId"
              element={
                <WorkflowRoute allowedRoles={LEASE_ROLES}>
                  <LeaseDetailsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/maintenance"
              element={
                <WorkflowRoute allowedRoles={MAINTENANCE_ROLES}>
                  <MaintenanceListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/maintenance/:ticketId"
              element={
                <WorkflowRoute allowedRoles={MAINTENANCE_ROLES}>
                  <MaintenanceDetailsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/renewals"
              element={
                <WorkflowRoute allowedRoles={RENEWAL_ROLES}>
                  <RenewalAlertListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/renewals/:alertId"
              element={
                <WorkflowRoute allowedRoles={RENEWAL_ROLES}>
                  <RenewalAlertDetailsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/finance"
              element={<Navigate to="/finance/charges" replace />}
            />
            <Route
              path="/finance/rent-schedules"
              element={
                <WorkflowRoute allowedRoles={FINANCE_MANAGEMENT_ROLES}>
                  <RentScheduleListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/finance/charges"
              element={
                <WorkflowRoute allowedRoles={FINANCE_ROLES}>
                  <ChargeListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/finance/charges/:chargeId"
              element={
                <WorkflowRoute allowedRoles={FINANCE_ROLES}>
                  <ChargeDetailsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/finance/deposits"
              element={
                <WorkflowRoute allowedRoles={FINANCE_ROLES}>
                  <DepositListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/finance/deposits/:depositId"
              element={
                <WorkflowRoute allowedRoles={FINANCE_ROLES}>
                  <DepositDetailsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/finance/payments"
              element={
                <WorkflowRoute allowedRoles={FINANCE_ROLES}>
                  <PaymentListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/finance/payments/:paymentId"
              element={
                <WorkflowRoute allowedRoles={FINANCE_ROLES}>
                  <PaymentDetailsPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/finance/receipts"
              element={
                <WorkflowRoute allowedRoles={FINANCE_ROLES}>
                  <ReceiptListPage />
                </WorkflowRoute>
              }
            />
            <Route
              path="/finance/receipts/:receiptId"
              element={
                <WorkflowRoute allowedRoles={FINANCE_ROLES}>
                  <ReceiptDetailsPage />
                </WorkflowRoute>
              }
            />
            {import.meta.env.DEV && (
              <>
                <Route
                  path="/internal/workflows/properties"
                  element={
                    <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                      <PropertiesPage />
                    </WorkflowRoute>
                  }
                />
                <Route
                  path="/internal/workflows/units"
                  element={
                    <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                      <UnitsPage />
                    </WorkflowRoute>
                  }
                />
                <Route
                  path="/internal/workflows/listings"
                  element={
                    <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                      <ListingsPage />
                    </WorkflowRoute>
                  }
                />
                <Route
                  path="/internal/workflows/applications"
                  element={
                    <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                      <ApplicationsPage />
                    </WorkflowRoute>
                  }
                />
                <Route
                  path="/internal/workflows/leases"
                  element={
                    <WorkflowRoute allowedRoles={MANAGEMENT_ROLES}>
                      <LeasesPage />
                    </WorkflowRoute>
                  }
                />
                <Route
                  path="/internal/workflows/finance"
                  element={
                    <WorkflowRoute allowedRoles={FINANCE_ROLES}>
                      <FinancePage />
                    </WorkflowRoute>
                  }
                />
                <Route
                  path="/internal/workflows/maintenance"
                  element={
                    <WorkflowRoute allowedRoles={MAINTENANCE_ROLES}>
                      <MaintenancePage />
                    </WorkflowRoute>
                  }
                />
                <Route
                  path="/internal/workflows/renewals"
                  element={
                    <WorkflowRoute allowedRoles={RENEWAL_ROLES}>
                      <RenewalsPage />
                    </WorkflowRoute>
                  }
                />
              </>
            )}
            <Route
              path="/"
              element={
                <MarketplaceLayout>
                  <HomePage />
                </MarketplaceLayout>
              }
            />
            <Route
              path="*"
              element={<Navigate to="/" replace />}
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
