import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useAllRentSchedules: vi.fn(),
  useAuth: vi.fn(),
  useGenerateRentCharges: vi.fn(),
  useRentCharges: vi.fn(),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));
vi.mock("../hooks/useFinance", () => ({
  useAllRentSchedules: mocks.useAllRentSchedules,
  useGenerateRentCharges: mocks.useGenerateRentCharges,
  useRentCharges: mocks.useRentCharges,
}));
vi.mock("../components/FinanceNavigation", () => ({
  FinanceNavigation: () => null,
}));
vi.mock("../components/RentChargeGenerateModal", () => ({
  RentChargeGenerateModal: () => null,
}));

import { ChargeListPage } from "../pages/ChargeListPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <ChargeListPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useAuth.mockReturnValue({
    user: { id: "owner-id", role: "OWNER" },
  });
  mocks.useRentCharges.mockReturnValue({
    data: { count: 0, results: [] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useGenerateRentCharges.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn(),
  });
  mocks.useAllRentSchedules.mockReturnValue({
    data: [],
    error: null,
    isError: false,
    isSuccess: true,
    refetch: vi.fn(),
  });
});

afterEach(() => cleanup());

describe("ChargeListPage rent schedule guidance", () => {
  it("links managers to schedule management when no active schedules exist", () => {
    renderPage();

    expect(screen.getByText("No active rent schedules")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Manage rent schedules" }),
    ).toHaveAttribute("href", "/finance/rent-schedules");
  });

  it("does not query or link tenant users to schedule management", () => {
    mocks.useAuth.mockReturnValue({
      user: { id: "tenant-id", role: "TENANT" },
    });

    renderPage();

    expect(mocks.useAllRentSchedules).toHaveBeenCalledWith(false);
    expect(
      screen.queryByRole("link", { name: "Manage rent schedules" }),
    ).not.toBeInTheDocument();
  });
});
