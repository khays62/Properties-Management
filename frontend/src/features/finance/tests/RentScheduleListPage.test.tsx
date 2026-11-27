import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useCreateRentSchedule: vi.fn(),
  useRentSchedules: vi.fn(),
  useUpdateRentSchedule: vi.fn(),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));
vi.mock("../hooks/useFinance", () => ({
  useCreateRentSchedule: mocks.useCreateRentSchedule,
  useRentSchedules: mocks.useRentSchedules,
  useUpdateRentSchedule: mocks.useUpdateRentSchedule,
}));
vi.mock("../components/RentScheduleFormModal", () => ({
  RentScheduleFormModal: () => null,
}));

import { RentScheduleListPage } from "../pages/RentScheduleListPage";

const schedule = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  lease: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  due_day: 15,
  frequency: "MONTHLY",
  is_active: true,
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <RentScheduleListPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useAuth.mockReturnValue({
    user: { id: "owner-id", role: "OWNER" },
  });
  mocks.useRentSchedules.mockReturnValue({
    data: { count: 1, results: [schedule] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useCreateRentSchedule.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  });
  mocks.useUpdateRentSchedule.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  });
});

afterEach(() => cleanup());

describe("RentScheduleListPage", () => {
  it("lists lease, due day, frequency, state, and creation date", () => {
    renderPage();

    expect(screen.getByRole("table", { name: "Rent schedules" })).toBeVisible();
    expect(screen.getByText("Lease 6de0f86d")).toBeVisible();
    expect(screen.getByText("15")).toBeVisible();
    expect(screen.getByText("Monthly")).toBeVisible();
    expect(screen.getByText("Active")).toBeVisible();
    expect(screen.getByText("Nov 26, 2026")).toBeVisible();
  });

  it("guides the user to create a schedule when the list is empty", () => {
    mocks.useRentSchedules.mockReturnValue({
      data: { count: 0, results: [] },
      error: null,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("No rent schedules")).toBeVisible();
    expect(
      screen.getByText(
        "Create a rent schedule first before generating rent charges.",
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Create rent schedule" }),
    ).toBeVisible();
  });

  it("does not expose schedule mutations to tenant users", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "tenant-id", role: "TENANT" },
    });

    renderPage();

    expect(mocks.useRentSchedules).toHaveBeenLastCalledWith(
      { page: 1 },
      false,
    );
    expect(
      screen.queryByRole("button", { name: "Create rent schedule" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", {
        name: `Rent schedule actions for lease ${schedule.lease.slice(0, 8)}`,
      }),
    ).not.toBeInTheDocument();
  });
});
