import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useListingProperties: vi.fn(),
  useListings: vi.fn(),
}));

vi.mock("../hooks/useListings", () => ({
  useListingProperties: mocks.useListingProperties,
  useListings: mocks.useListings,
}));
vi.mock("../components/ListingCreateModal", () => ({
  ListingCreateModal: () => null,
}));
vi.mock("../components/ListingEditModal", () => ({
  ListingEditModal: () => null,
}));

import { ListingListPage } from "../pages/ListingListPage";

const property = {
  id: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  name: "Harbor View",
  code: "HV-01",
};

function LocationSearch() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

function renderPage() {
  return render(
    <MemoryRouter
      initialEntries={[
        `/listings?search=harbor&property=${property.id}&status=PUBLISHED&city=Mogadishu&available_date=2026-12-01&page=2`,
      ]}
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <ListingListPage />
      <LocationSearch />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useListingProperties.mockReturnValue({
    data: [property],
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useListings.mockReturnValue({
    data: { count: 60, results: [] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
});

afterEach(() => cleanup());

describe("ListingListPage URL state", () => {
  it("hydrates all supported filters and retains them when changing the page", () => {
    renderPage();

    expect(mocks.useListings).toHaveBeenLastCalledWith({
      search: "harbor",
      property: property.id,
      status: "PUBLISHED",
      city: "Mogadishu",
      available_date: "2026-12-01",
      page: 2,
    });
    expect(screen.getByLabelText("Search listings")).toHaveValue("harbor");

    fireEvent.change(screen.getByLabelText("City"), {
      target: { value: "Hargeisa" },
    });
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      `?search=harbor&property=${property.id}&status=PUBLISHED&city=Hargeisa&available_date=2026-12-01`,
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to next page" }));
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      `?search=harbor&property=${property.id}&status=PUBLISHED&city=Hargeisa&available_date=2026-12-01&page=2`,
    );
  });
});
