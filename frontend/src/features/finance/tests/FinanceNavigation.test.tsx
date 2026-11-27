import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

import { FinanceNavigation } from "../components/FinanceNavigation";

function renderNavigation(role: string) {
  mocks.useAuth.mockReturnValue({
    user: { id: "user-id", role },
  });
  return render(
    <MemoryRouter>
      <FinanceNavigation />
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe("FinanceNavigation rent schedule access", () => {
  it("shows schedules to owners, property managers, and accountants", () => {
    for (const role of ["OWNER", "PROPERTY_MANAGER", "ACCOUNTANT"]) {
      const { unmount } = renderNavigation(role);
      expect(
        screen.getByRole("link", { name: "Rent Schedules" }),
      ).toHaveAttribute("href", "/finance/rent-schedules");
      unmount();
    }
  });

  it("hides schedules from tenants", () => {
    renderNavigation("TENANT");

    expect(
      screen.queryByRole("link", { name: "Rent Schedules" }),
    ).not.toBeInTheDocument();
  });
});
