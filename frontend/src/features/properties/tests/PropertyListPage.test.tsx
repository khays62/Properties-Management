import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useProperties: vi.fn(),
}));

vi.mock("../../../hooks/useAuth", () => ({ useAuth: mocks.useAuth }));
vi.mock("../hooks/useProperties", () => ({
  useProperties: mocks.useProperties,
}));
vi.mock("../components/PropertyCreateModal", () => ({
  PropertyCreateModal: () => null,
}));
vi.mock("../components/PropertyActionDialogs", () => ({
  PropertyActionDialogs: () => null,
}));

import { PropertyListPage } from "../pages/PropertyListPage";

function LocationSearch() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        "/properties?search=harbor&status=ACTIVE&city=Mogadishu&page=2",
      ]}
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <PropertyListPage />
      <LocationSearch />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useAuth.mockReturnValue({ user: { role: "OWNER" } });
  mocks.useProperties.mockReturnValue({
    data: { count: 60, results: [] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
});

afterEach(() => cleanup());

describe("PropertyListPage URL state", () => {
  it("hydrates search, filters, and pagination from the URL and preserves them on updates", () => {
    renderPage();

    expect(mocks.useProperties).toHaveBeenLastCalledWith({
      search: "harbor",
      status: "ACTIVE",
      city: "Mogadishu",
      page: 2,
    });
    expect(screen.getByLabelText("Search properties")).toHaveValue("harbor");

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "INACTIVE" },
    });
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?search=harbor&status=INACTIVE&city=Mogadishu",
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?search=harbor&status=INACTIVE&city=Mogadishu&page=2",
    );
  });
});
