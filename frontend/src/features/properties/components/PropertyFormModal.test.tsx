import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PropertyFormModal } from "./PropertyFormModal";
import type { Property, PropertyInput } from "../types/property";

afterEach(cleanup);

const property: Property = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  owner: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  name: "Harbor View",
  code: "HV-01",
  description: "Near the waterfront",
  address: "10 Harbor Road",
  city: "Mogadishu",
  country: "Somalia",
  status: "ACTIVE",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

async function fillRequiredFields(
  user: ReturnType<typeof userEvent.setup>,
  values: PropertyInput,
) {
  await user.clear(screen.getByLabelText("Property name"));
  await user.type(screen.getByLabelText("Property name"), values.name);
  await user.clear(screen.getByLabelText("Property code"));
  await user.type(screen.getByLabelText("Property code"), values.code);
  await user.clear(screen.getByLabelText("Street address"));
  await user.type(screen.getByLabelText("Street address"), values.address);
  await user.clear(screen.getByLabelText("City"));
  await user.type(screen.getByLabelText("City"), values.city);
  await user.clear(screen.getByLabelText("Country"));
  await user.type(screen.getByLabelText("Country"), values.country);
  await user.clear(screen.getByLabelText("Description"));
  await user.type(screen.getByLabelText("Description"), values.description);
}

describe("PropertyFormModal", () => {
  it("blocks submission until required fields are valid", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(_: PropertyInput) => Promise<void>>();

    render(
      <PropertyFormModal
        open
        mode="create"
        onClose={vi.fn()}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create property" }));

    expect(await screen.findByText("Enter a property name.")).toBeVisible();
    expect(screen.getByText("Enter a property code.")).toBeVisible();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("submits validated, trimmed values when editing", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn<(_: PropertyInput) => Promise<void>>().mockResolvedValue();
    const onClose = vi.fn();
    const values: PropertyInput = {
      name: "Harbor Residence",
      code: "HV-02",
      address: "12 Harbor Road",
      city: "Mogadishu",
      country: "Somalia",
      description: "Updated details",
    };

    render(
      <PropertyFormModal
        open
        mode="edit"
        property={property}
        onClose={onClose}
        onSave={onSave}
      />,
    );

    await fillRequiredFields(user, {
      ...values,
      name: ` ${values.name} `,
    });
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(values);
      expect(onClose).toHaveBeenCalledOnce();
    });
  });
});
