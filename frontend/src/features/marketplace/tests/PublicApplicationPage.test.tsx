import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const { mutateAsync, refetch } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  refetch: vi.fn(),
}));

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
    refetch,
  }),
  useSubmitPublicApplication: () => ({
    isPending: false,
    mutateAsync,
  }),
}));

import { PublicApplicationPage } from "../pages/PublicApplicationPage";

function SuccessRoute() {
  return <p>Application success route</p>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mutateAsync.mockResolvedValue({});
});

afterEach(cleanup);

describe("PublicApplicationPage", () => {
  it("submits the serializer-supported applicant fields and shows success", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
        initialEntries={[
          "/listings/c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac/apply",
        ]}
      >
        <Routes>
          <Route
            path="/listings/:listingId/apply"
            element={<PublicApplicationPage />}
          />
          <Route path="/applications/success" element={<SuccessRoute />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("First name"), "Amina");
    await user.type(screen.getByLabelText("Last name"), "Applicant");
    await user.type(screen.getByLabelText("Email"), "amina@example.com");
    await user.type(screen.getByLabelText("Phone"), "+252610000000");
    await user.selectOptions(
      screen.getByLabelText("Employment status"),
      "EMPLOYED",
    );
    await user.type(
      screen.getByLabelText("Employer name"),
      "Example Employer",
    );
    await user.type(screen.getByLabelText("Monthly income"), "1500.00");
    await user.type(
      screen.getByLabelText("Preferred move-in date"),
      "2099-12-01",
    );
    await user.type(screen.getByLabelText("Current address"), "Mogadishu");
    await user.type(screen.getByLabelText("Additional notes"), "Please email.");
    await user.click(screen.getByRole("button", { name: "Submit application" }));

    expect(await screen.findByText("Application success route")).toBeVisible();
    expect(mutateAsync).toHaveBeenCalledWith({
      listing: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
      move_in_date: "2099-12-01",
      notes: "Please email.",
      applicant: {
        first_name: "Amina",
        last_name: "Applicant",
        email: "amina@example.com",
        phone: "+252610000000",
        employment_status: "EMPLOYED",
        employer_name: "Example Employer",
        monthly_income: "1500.00",
        current_address: "Mogadishu",
      },
    });
  });
});
