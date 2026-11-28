import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: mocks.useAuth,
}));

vi.mock("./Navbar", () => ({
  Navbar: () => null,
}));

vi.mock("./Sidebar", () => ({
  Sidebar: ({ items }: { items: Array<{ label: string; href?: string }> }) => (
    <nav aria-label="Test sidebar">
      {items.map((item) =>
        item.href ? (
          <a key={item.href} href={item.href}>
            {item.label}
          </a>
        ) : null,
      )}
    </nav>
  ),
}));

import { AppShell } from "./AppShell";
import { RoleRoute } from "../routes/RoleRoute";

function renderShell(role: string) {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: () => null,
      setItem: vi.fn(),
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: () => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
  mocks.useAuth.mockReturnValue({
    user: { id: "user-id", role },
  });
  return render(
    <MemoryRouter>
      <AppShell>
        <div>Page</div>
      </AppShell>
    </MemoryRouter>,
  );
}

afterEach(() => cleanup());

describe("Owner team navigation", () => {
  it("shows Team Management only to Owners", () => {
    const { unmount } = renderShell("OWNER");
    expect(
      screen.getByRole("link", { name: "Team Management" }),
    ).toHaveAttribute("href", "/team");
    unmount();

    for (const role of ["PROPERTY_MANAGER", "ACCOUNTANT", "TENANT"]) {
      const view = renderShell(role);
      expect(
        screen.queryByRole("link", { name: "Team Management" }),
      ).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("blocks non-Owners from the Owner-only team route", () => {
    mocks.useAuth.mockReturnValue({
      status: "authenticated",
      user: { id: "manager-id", role: "PROPERTY_MANAGER" },
    });
    render(
      <MemoryRouter initialEntries={["/team"]}>
        <Routes>
          <Route
            path="/team"
            element={
              <RoleRoute allowedRoles={["OWNER"]}>
                <h1>Protected team directory</h1>
              </RoleRoute>
            }
          />
          <Route path="/unauthorized" element={<h1>Unauthorized</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Unauthorized" })).toBeVisible();
    expect(
      screen.queryByRole("heading", { name: "Protected team directory" }),
    ).not.toBeInTheDocument();
  });
});
