import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useAllRentSchedules: vi.fn(),
  useFinanceLeaseOptions: vi.fn(),
}));

vi.mock("../hooks/useFinance", () => ({
  useAllRentSchedules: mocks.useAllRentSchedules,
  useFinanceLeaseOptions: mocks.useFinanceLeaseOptions,
}));

import { RentScheduleFormModal } from "../components/RentScheduleFormModal";
import type { RentSchedule } from "../types/finance";
import type { LeaseDetails } from "../../leases/types/lease";

const activeLease: LeaseDetails = {
  id: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  tenant: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
  tenant_name: "Amina Tenant",
  lease_label: "Amina Tenant - Unit A-101",
  unit: "a5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  unit_number: "A-101",
  property_name: "Test Property",
  application: "b5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  start_date: "2026-01-01",
  end_date: "2027-01-01",
  monthly_rent: "800.00",
  deposit_amount: "800.00",
  payment_due_day: 15,
  status: "ACTIVE",
  approved_by: null,
  approved_at: null,
  notes: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  status_history: [],
};

const expiringLease: LeaseDetails = {
  ...activeLease,
  id: "7de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  status: "EXPIRING",
  payment_due_day: 28,
};

const draftLease: LeaseDetails = {
  ...activeLease,
  id: "8de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  status: "DRAFT",
};

const existingSchedule: RentSchedule = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  lease: activeLease.id,
  due_day: 15,
  frequency: "MONTHLY",
  is_active: true,
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
};

function renderModal(
  props: Partial<React.ComponentProps<typeof RentScheduleFormModal>> = {},
) {
  const onCreate = vi.fn().mockResolvedValue(existingSchedule);
  const onUpdate = vi.fn().mockResolvedValue(existingSchedule);
  const onSaved = vi.fn();
  render(
    <RentScheduleFormModal
      open
      schedule={null}
      onClose={vi.fn()}
      onCreate={onCreate}
      onUpdate={onUpdate}
      onSaved={onSaved}
      {...props}
    />,
  );
  return { onCreate, onUpdate, onSaved };
}

beforeEach(() => {
  mocks.useFinanceLeaseOptions.mockReturnValue({
    data: [activeLease, expiringLease, draftLease],
    error: null,
    isError: false,
    isLoading: false,
    isSuccess: true,
    refetch: vi.fn(),
  });
  mocks.useAllRentSchedules.mockReturnValue({
    data: [existingSchedule],
    error: null,
    isError: false,
    isLoading: false,
    isSuccess: true,
    refetch: vi.fn(),
  });
});

afterEach(() => cleanup());

describe("RentScheduleFormModal", () => {
  it("offers only eligible unscheduled leases and creates a monthly schedule", async () => {
    const { onCreate, onSaved } = renderModal();

    const leaseSelector = screen.getByRole("combobox", { name: "Lease" });
    expect(leaseSelector).toHaveTextContent("Amina Tenant");
    expect(leaseSelector).toHaveTextContent("Unit A-101");
    expect(leaseSelector).not.toHaveTextContent("DRAFT");
    expect(leaseSelector).not.toHaveTextContent(activeLease.id);

    fireEvent.change(leaseSelector, {
      target: { value: expiringLease.id },
    });
    expect(screen.getByLabelText("Due day")).toHaveValue(28);
    fireEvent.change(screen.getByLabelText("Schedule state"), {
      target: { value: "false" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create rent schedule" }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        lease: expiringLease.id,
        due_day: 28,
        frequency: "MONTHLY",
        is_active: false,
      }),
    );
    expect(onSaved).toHaveBeenCalledWith("create");
  });

  it("updates schedule state without sending a lease reassignment", async () => {
    const { onUpdate, onSaved } = renderModal({
      schedule: existingSchedule,
    });

    expect(screen.getByLabelText("Due day")).toHaveValue(15);
    fireEvent.change(screen.getByLabelText("Schedule state"), {
      target: { value: "false" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(existingSchedule.id, {
        due_day: 15,
        frequency: "MONTHLY",
        is_active: false,
      }),
    );
    expect(onSaved).toHaveBeenCalledWith("edit");
  });

  it("explains when there are no eligible leases", () => {
    mocks.useFinanceLeaseOptions.mockReturnValue({
      data: [draftLease],
      error: null,
      isError: false,
      isLoading: false,
      isSuccess: true,
      refetch: vi.fn(),
    });
    mocks.useAllRentSchedules.mockReturnValue({
      data: [],
      error: null,
      isError: false,
      isLoading: false,
      isSuccess: true,
      refetch: vi.fn(),
    });

    renderModal();
    expect(screen.getByText("No eligible leases")).toBeInTheDocument();
  });
});
