import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, patch, post } = vi.hoisted(() => ({
  get: vi.fn(),
  patch: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../../services/api", () => ({
  api: { get, patch, post },
}));

import {
  createListing,
  fetchListings,
  transitionListing,
  updateListing,
} from "./listings.api";
import type { ListingInput, ListingUpdateInput } from "../types/listing";

const listing = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  unit: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  title: "Bright two-bedroom apartment",
  description: "Close to local services.",
  rent_amount: "725.00",
  deposit_amount: "500.00",
  available_date: "2026-12-01",
  published_at: null,
  expires_at: null,
  status: "DRAFT",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

const createValues: ListingInput = {
  unit: listing.unit,
  title: listing.title,
  description: listing.description,
  rent_amount: "725.00",
  deposit_amount: "500.00",
  available_date: "2026-12-01",
  expires_at: null,
};

const updateValues: ListingUpdateInput = {
  title: "Updated apartment",
  description: listing.description,
  rent_amount: "750.00",
  deposit_amount: "500.00",
  available_date: "2026-12-15",
  expires_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listings API", () => {
  it("requests listings with only backend-supported filters", async () => {
    get.mockResolvedValue({
      data: { count: 1, results: [listing] },
    });

    await expect(
      fetchListings({
        property: listing.unit,
        status: "DRAFT",
        city: "Mogadishu",
        available_date: "2026-12-01",
        search: "bright",
        page: 2,
      }),
    ).resolves.toEqual({ count: 1, results: [listing] });

    expect(get).toHaveBeenCalledWith("listings/", {
      params: {
        page_size: 20,
        property: listing.unit,
        status: "DRAFT",
        city: "Mogadishu",
        available_date: "2026-12-01",
        search: "bright",
        page: 2,
      },
    });
  });

  it("creates listings without attempting to set their workflow status", async () => {
    post.mockResolvedValue({ data: listing });

    await expect(createListing(createValues)).resolves.toEqual(listing);
    expect(post).toHaveBeenCalledWith("listings/", createValues);
  });

  it("updates editable listing fields without sending the unit", async () => {
    patch.mockResolvedValue({
      data: { ...listing, ...updateValues },
    });

    await expect(
      updateListing(listing.id, updateValues),
    ).resolves.toMatchObject(updateValues);
    expect(patch).toHaveBeenCalledWith(
      `listings/${listing.id}/`,
      updateValues,
    );
  });

  it("uses the backend publish action endpoint", async () => {
    post.mockResolvedValue({ data: { ...listing, status: "PUBLISHED" } });

    await expect(
      transitionListing(listing.id, "publish"),
    ).resolves.toMatchObject({ status: "PUBLISHED" });
    expect(post).toHaveBeenCalledWith(
      `listings/${listing.id}/publish/`,
      {},
    );
  });
});
