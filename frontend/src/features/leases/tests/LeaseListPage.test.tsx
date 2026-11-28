import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useCreateLease: vi.fn(),
  useLeasePropertyOptions: vi.fn(),
  useLeaseTenantOptions: vi.fn(),
  useLeaseUnitOptions: vi.fn(),
  useLeases: vi.fn(),
}));

vi.mock("../../../hooks/useAuth", () => ({ useAuth: mocks.useAuth }));
vi.mock("../hooks/useLeases", () => ({
  useCreateLease: mocks.useCreateLease,
  useLeasePropertyOptions: mocks.useLeasePropertyOptions,
  useLeaseTenantOptions: mocks.useLeaseTenantOptions,
  useLeaseUnitOptions: mocks.useLeaseUnitOptions,
  useLeases: mocks.useLeases,
}));
vi.mock("../components/LeaseCreateModal", () => ({
  LeaseCreateModal: () => null,
}));
vi.mock("../components/LeaseWorkflowDialogs", () => ({
  LeaseWorkflowDialogs: () => null,
}));

import { LeaseListPage } from "../pages/LeaseListPage";

const lease = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  tenant: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  tenant_name: "Amina Tenant",
  tenant_email: "tenant@example.com",
  lease_label: "Amina Tenant - Unit A-101",
  unit: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
  unit_number: "A-101",
  property_name: "Lease Test Property",
  application: "4e82f780-2174-4d86-b37f-047b846d6b3f",
  start_date: "2026-01-01",
  end_date: "2027-01-01",
  monthly_rent: "800.00",
  deposit_amount: "800.00",
  payment_due_day: 1,
  status: "DRAFT" as const,
  approved_by: null,
  approved_at: null,
  notes: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  status_history: [],
};

beforeEach(() => {
  mocks.useAuth.mockReturnValue({
    user: { id: lease.tenant, role: "TENANT" },
  });
  mocks.useLeasePropertyOptions.mockReturnValue({
    data: [],
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useLeaseTenantOptions.mockReturnValue({
    data: [],
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useLeaseUnitOptions.mockReturnValue({
    data: [],
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useLeases.mockReturnValue({
    data: { count: 1, results: [lease] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useCreateLease.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  });
});

afterEach(() => cleanup());

describe("LeaseListPage role actions", () => {
  it("allows a tenant to view a lease but hides manager-only workflow actions", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
      >
        <LeaseListPage />
      </MemoryRouter>,
    );

    await user.click(
      screen.getByRole("button", {
        name: `Lease actions for ${lease.lease_label}`,
      }),
    );

    expect(screen.getByText("Amina Tenant")).toBeVisible();
    expect(screen.queryByText(lease.tenant)).not.toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "View details" })).toBeVisible();
    expect(
      screen.queryByRole("menuitem", { name: "Submit for approval" }),
    ).not.toBeInTheDocument();
  });
});
