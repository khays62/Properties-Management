import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("../hooks/usePublicListings", () => ({
  usePublicListing: () => ({
    data: {
      id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
      title: "Bright two-bedroom apartment",
      description: "Close to local services.",
      rent_amount: "725.00",
      deposit_amount: "500.00",
      available_date: "2099-12-01",
      status: "PUBLISHED",
      unit: {
        unit_number: "B-101",
        floor: 1,
        bedrooms: 2,
        bathrooms: "1.50",
        square_meters: "78.00",
        property: {
          name: "Riverside Apartments",
          address: "10 River Road",
          city: "Mogadishu",
          country: "Somalia",
        },
      },
    },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

import { PublicListingDetailsPage } from "../pages/PublicListingDetailsPage";

afterEach(cleanup);

describe("PublicListingDetailsPage", () => {
  it("renders a bookmarked listing route without navigation state", () => {
    render(
      <MemoryRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
        initialEntries={[
          "/listings/c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
        ]}
      >
        <Routes>
          <Route
            path="/listings/:listingId"
            element={<PublicListingDetailsPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Bright two-bedroom apartment",
      }),
    ).toBeVisible();
    expect(screen.getByText("Riverside Apartments")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Apply for this listing" }),
    ).toHaveAttribute(
      "href",
      "/listings/c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac/apply",
    );
  });
});
