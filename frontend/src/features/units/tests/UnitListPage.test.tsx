import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useProperties: vi.fn(),
  useUnits: vi.fn(),
}));

vi.mock("../../properties/hooks/useProperties", () => ({
  useProperties: mocks.useProperties,
}));
vi.mock("../hooks/useUnits", () => ({ useUnits: mocks.useUnits }));
vi.mock("../components/UnitCreateModal", () => ({
  UnitCreateModal: () => null,
}));
vi.mock("../components/UnitEditModal", () => ({
  UnitEditModal: () => null,
}));

import { UnitListPage } from "../pages/UnitListPage";

const property = {
  id: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  owner: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  name: "Harbor View",
  code: "HV-01",
  description: "",
  address: "10 Harbor Road",
  city: "Mogadishu",
  country: "Somalia",
  status: "ACTIVE",
  unit_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function LocationSearch() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        `/units?property=${property.id}&search=balcony&status=AVAILABLE&page=2`,
      ]}
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <UnitListPage />
      <LocationSearch />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useProperties.mockReturnValue({
    data: { count: 1, results: [property] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useUnits.mockReturnValue({
    data: { count: 60, results: [] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
});

afterEach(() => cleanup());

describe("UnitListPage URL state", () => {
  it("hydrates all list controls from the URL and preserves them while paging", () => {
    renderPage();

    expect(mocks.useUnits).toHaveBeenLastCalledWith({
      property: property.id,
      search: "balcony",
      status: "AVAILABLE",
      page: 2,
    });
    expect(screen.getByLabelText("Search units")).toHaveValue("balcony");

    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "LISTED" },
    });
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      `?property=${property.id}&search=balcony&status=LISTED`,
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      `?property=${property.id}&search=balcony&status=LISTED&page=2`,
    );
  });
});
