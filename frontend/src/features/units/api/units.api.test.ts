import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, patch, post } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../../services/api", () => ({
  api: { get, patch, post },
}));

import { archiveUnit, createUnit, fetchUnits } from "./units.api";
import type { UnitInput } from "../types/unit";

const unit = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  property: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  unit_number: "3B",
  floor: 3,
  bedrooms: 2,
  bathrooms: "1.50",
  square_meters: "82.50",
  rent_amount: "1250.00",
  deposit_amount: "1250.00",
  description: "",
  status: "AVAILABLE",
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const values: UnitInput = {
  property: unit.property,
  unit_number: "3B",
  floor: 3,
  bedrooms: 2,
  bathrooms: 1.5,
  square_meters: 82.5,
  rent_amount: 1250,
  deposit_amount: 1250,
  description: "",
  status: "AVAILABLE",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("units API", () => {
  it("requests paginated units with property and status filters", async () => {
    get.mockResolvedValue({
      data: { count: 1, results: [unit] },
    });

    await expect(
      fetchUnits({
        property: unit.property,
        status: "AVAILABLE",
        page: 2,
      }),
    ).resolves.toEqual({ count: 1, results: [unit] });

    expect(get).toHaveBeenCalledWith("units/", {
      params: {
        page_size: 20,
        property: unit.property,
        status: "AVAILABLE",
        page: 2,
      },
    });
  });

  it("creates units through the existing API endpoint", async () => {
    post.mockResolvedValue({ data: unit });

    await expect(createUnit(values)).resolves.toEqual(unit);
    expect(post).toHaveBeenCalledWith("units/", values);
  });

  it("archives by deactivating the unit through its existing update endpoint", async () => {
    patch.mockResolvedValue({
      data: { ...unit, is_active: false },
    });

    await expect(archiveUnit(unit.id)).resolves.toMatchObject({
      id: unit.id,
      is_active: false,
    });
    expect(patch).toHaveBeenCalledWith(`units/${unit.id}/`, {
      is_active: false,
    });
  });
});
