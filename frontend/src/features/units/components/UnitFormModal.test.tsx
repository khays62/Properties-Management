import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Property } from "../../properties/types/property";
import { UnitFormModal } from "./UnitFormModal";
import type { UnitInput } from "../types/unit";

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
  unit_count: 0,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("UnitFormModal", () => {
  it("requires a property and valid unit measurements", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(_: UnitInput) => Promise<void>>();

    render(
      <UnitFormModal
        open
        mode="create"
        properties={[property]}
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create unit" }));

    expect(await screen.findByText("Select a property.")).toBeVisible();
    expect(screen.getAllByText("Enter a number.")).toHaveLength(2);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits parsed values and closes after a successful save", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(_: UnitInput) => Promise<void>>().mockResolvedValue();
    const onClose = vi.fn();

    render(
      <UnitFormModal
        open
        mode="create"
        properties={[property]}
        initialPropertyId={property.id}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    await user.type(screen.getByLabelText("Unit number"), " 3B ");
    await user.type(screen.getByLabelText("Area (m²)"), "82.5");
    await user.type(screen.getByLabelText("Monthly rent"), "1250.00");
    await user.click(screen.getByRole("button", { name: "Create unit" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        property: property.id,
        unit_number: "3B",
        floor: 0,
        bedrooms: 0,
        bathrooms: 0,
        square_meters: 82.5,
        rent_amount: 1250,
        deposit_amount: 0,
        description: "",
        status: "AVAILABLE",
      });
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
