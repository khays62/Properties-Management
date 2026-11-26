import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const {
  useApplication,
  useApplicationTransition,
  useRejectApplication,
  useScreeningTransition,
  useListing,
  useProperty,
  useUnit,
} = vi.hoisted(() => ({
  useApplication: vi.fn(),
  useApplicationTransition: vi.fn(),
  useRejectApplication: vi.fn(),
  useScreeningTransition: vi.fn(),
  useListing: vi.fn(),
  useProperty: vi.fn(),
  useUnit: vi.fn(),
}));

vi.mock("../hooks/useApplications", () => ({
  useApplication,
  useApplicationTransition,
  useRejectApplication,
  useScreeningTransition,
}));

vi.mock("../../listings/hooks/useListings", () => ({ useListing }));
vi.mock("../../properties/hooks/useProperties", () => ({ useProperty }));
vi.mock("../../units/hooks/useUnits", () => ({ useUnit }));

import { ApplicationDetailsPage } from "../pages/ApplicationDetailsPage";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ApplicationDetailsPage", () => {
  it("renders action dialogs with unique React keys", () => {
    useApplication.mockReturnValue({
      data: {
        id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
        listing: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
        applicant: {
          id: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
          first_name: "Amina",
          last_name: "Applicant",
          email: "amina@example.com",
          phone: "+252610000000",
          employment_status: "EMPLOYED",
          employer_name: "Example Employer",
          monthly_income: "1500.00",
          current_address: "Mogadishu",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
        move_in_date: "2026-12-01",
        notes: "",
        rejection_reason: "",
        status: "APPROVED",
        submitted_at: "2026-11-01T00:00:00Z",
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-01T00:00:00Z",
        screening: null,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useApplicationTransition.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useRejectApplication.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useScreeningTransition.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useListing.mockReturnValue({
      data: {
        id: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
        unit: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
        title: "Test listing",
        rent_amount: "800.00",
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useUnit.mockReturnValue({
      data: {
        id: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
        property: "c91a356a-a436-4ee9-9676-f4312469a834",
        unit_number: "A-101",
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useProperty.mockReturnValue({
      data: {
        id: "c91a356a-a436-4ee9-9676-f4312469a834",
        name: "Test Property",
        city: "Mogadishu",
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    const consoleWarn = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);

    render(
      <MemoryRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
        initialEntries={[
          "/applications/c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
        ]}
      >
        <Routes>
          <Route
            path="/applications/:applicationId"
            element={<ApplicationDetailsPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });
});
