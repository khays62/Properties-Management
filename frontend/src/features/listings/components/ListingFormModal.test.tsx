import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Property } from "../../properties/types/property";
import { ListingFormModal } from "./ListingFormModal";
import type { ListingInput } from "../types/listing";

vi.mock("../hooks/useListings", () => ({
  useListingProperties: () => ({
    data: [property],
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
  useAvailableListingUnits: () => ({
    data: [unit],
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

afterEach(cleanup);

const property: Property = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  owner: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  name: "Harbor View",
  code: "HV-01",
  description: "",
  address: "10 Harbor Road",
  city: "Mogadishu",
  country: "Somalia",
  status: "ACTIVE",
  unit_count: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const unit = {
  id: "1293a03e-9dc1-4c72-872e-aebf60a0f402",
  property: property.id,
  unit_number: "A-101",
  floor: 1,
  bedrooms: 2,
  bathrooms: "1.50",
  square_meters: "78.00",
  rent_amount: "700.00",
  deposit_amount: "700.00",
  description: "",
  status: "AVAILABLE" as const,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("ListingFormModal", () => {
  it("requires a property, unit, and valid listing information", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn<(_: ListingInput) => Promise<void>>();

    render(
      <ListingFormModal
        open
        mode="create"
        onClose={vi.fn()}
        onCreate={onCreate}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create listing" }));

    expect(await screen.findByText("Select a property.")).toBeVisible();
    expect(screen.getByText("Enter a listing title.")).toBeVisible();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("submits a draft listing using the selected available unit", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn<(_: ListingInput) => Promise<void>>().mockResolvedValue();
    const onClose = vi.fn();

    render(
      <ListingFormModal
        open
        mode="create"
        onClose={onClose}
        onCreate={onCreate}
      />,
    );

    await user.selectOptions(screen.getByLabelText("Property"), property.id);
    await user.selectOptions(
      await screen.findByLabelText("Available unit"),
      unit.id,
    );
    await user.type(screen.getByLabelText("Listing title"), "  Harbor flat  ");
    await user.type(screen.getByLabelText("Monthly rent"), "725.00");
    await user.type(screen.getByLabelText("Deposit amount"), "500.00");
    await user.type(screen.getByLabelText("Available from"), "2026-12-01");
    await user.click(screen.getByRole("button", { name: "Create listing" }));

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        unit: unit.id,
        title: "Harbor flat",
        description: "",
        rent_amount: "725.00",
        deposit_amount: "500.00",
        available_date: "2026-12-01",
        expires_at: null,
      });
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
