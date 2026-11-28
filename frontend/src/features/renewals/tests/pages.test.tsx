import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useLease: vi.fn(),
  useLeasePropertyOptions: vi.fn(),
  useLeaseRenewal: vi.fn(),
  useGenerateRenewalAlerts: vi.fn(),
  useMarkRenewalAlertRead: vi.fn(),
  useRenewalAlert: vi.fn(),
  useRenewalAlerts: vi.fn(),
  useResolveRenewalAlert: vi.fn(),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("../../leases/hooks/useLeases", () => ({
  useLease: mocks.useLease,
  useLeasePropertyOptions: mocks.useLeasePropertyOptions,
  useLeaseRenewal: mocks.useLeaseRenewal,
}));

vi.mock("../hooks/useRenewals", () => ({
  useGenerateRenewalAlerts: mocks.useGenerateRenewalAlerts,
  useMarkRenewalAlertRead: mocks.useMarkRenewalAlertRead,
  useRenewalAlert: mocks.useRenewalAlert,
  useRenewalAlerts: mocks.useRenewalAlerts,
  useResolveRenewalAlert: mocks.useResolveRenewalAlert,
}));

import { RenewalAlertDetailsPage } from "../pages/RenewalAlertDetailsPage";
import { RenewalAlertListPage } from "../pages/RenewalAlertListPage";

const alert = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  lease: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  lease_label: "Amina Tenant - Unit A-101",
  tenant_name: "Amina Tenant",
  unit_number: "A-101",
  property_name: "Lease Test Property",
  alert_date: "2026-11-26",
  days_before_expiry: 90 as const,
  status: "UNREAD" as const,
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
};

const lease = {
  id: alert.lease,
  tenant: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
  tenant_name: "Amina Tenant",
  tenant_email: "tenant@example.com",
  lease_label: "Amina Tenant - Unit A-101",
  unit: "c91a356a-a436-4ee9-9676-f4312469a834",
  unit_number: "A-101",
  property_name: "Lease Test Property",
  property_code: "LEASE-TEST-01",
  application: "4e82f780-2174-4d86-b37f-047b846d6b3f",
  start_date: "2025-01-01",
  end_date: "2099-12-31",
  monthly_rent: "800.00",
  deposit_amount: "800.00",
  payment_due_day: 1,
  status: "ACTIVE" as const,
  approved_by: null,
  approved_at: null,
  notes: "",
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
  status_history: [],
};

const mutation = () => ({
  isPending: false,
  mutateAsync: vi.fn(),
});

function renderRenewalRoute(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <Routes>
        <Route path="/renewals" element={<RenewalAlertListPage />} />
        <Route
          path="/renewals/:alertId"
          element={<RenewalAlertDetailsPage />}
        />
        <Route
          path="/leases/:leaseId"
          element={<p>Successor lease pending approval</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useAuth.mockReturnValue({
    user: { id: lease.tenant, role: "OWNER" },
  });
  mocks.useLease.mockReturnValue({
    data: lease,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useLeasePropertyOptions.mockReturnValue({
    data: [],
    error: null,
    isError: false,
    refetch: vi.fn(),
  });
  mocks.useLeaseRenewal.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({
      ...lease,
      id: "4e82f780-2174-4d86-b37f-047b846d6b3f",
      status: "PENDING_APPROVAL",
    }),
  });
  mocks.useGenerateRenewalAlerts.mockReturnValue(mutation());
  mocks.useMarkRenewalAlertRead.mockReturnValue(mutation());
  mocks.useRenewalAlert.mockReturnValue({
    data: alert,
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useRenewalAlerts.mockReturnValue({
    data: { count: 1, results: [alert] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useResolveRenewalAlert.mockReturnValue(mutation());
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("renewal pages", () => {
  it("renders the alert list without React console warnings", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderRenewalRoute("/renewals?status=UNREAD&page=2");

    expect(screen.getByRole("heading", { name: "Renewals" })).toBeVisible();
    expect(screen.getByText("90 days")).toBeVisible();
    expect(screen.getByText(alert.lease_label)).toBeVisible();
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("opens the shared lease renewal form from alert details without warnings", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderRenewalRoute(`/renewals/${alert.id}`);
    await user.click(screen.getByRole("button", { name: "Renew lease" }));

    expect(
      screen.getByRole("heading", { name: "Renew lease" }),
    ).toBeVisible();
    expect(
      screen.getByLabelText("New lease end date"),
    ).toBeVisible();
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("routes a created successor lease into the existing approval flow", async () => {
    const user = userEvent.setup();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    renderRenewalRoute(`/renewals/${alert.id}`);
    await user.click(screen.getByRole("button", { name: "Renew lease" }));
    fireEvent.change(screen.getByLabelText("New lease end date"), {
      target: { value: "2100-12-31" },
    });
    await user.click(
      screen.getByRole("button", { name: "Create successor lease" }),
    );

    await waitFor(() => {
      expect(
        screen.getByText("Successor lease pending approval"),
      ).toBeVisible();
    });
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
