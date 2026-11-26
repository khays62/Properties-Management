import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
}));

vi.mock("../../../services/api", () => ({ api: apiMock }));

import { archiveProperty, fetchProperties } from "./properties.api";

const propertyRecord = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  owner: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  name: "Harbor View",
  code: "HV-01",
  description: "",
  address: "10 Harbor Road",
  city: "Mogadishu",
  country: "Somalia",
  status: "ACTIVE",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("property API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("parses paginated responses and sends property filters", async () => {
    apiMock.get.mockResolvedValue({
      data: { count: 21, results: [propertyRecord] },
    });

    const result = await fetchProperties({
      city: "Mogadishu",
      page: 2,
      status: "ACTIVE",
    });

    expect(apiMock.get).toHaveBeenCalledWith("properties/", {
      params: {
        page_size: 20,
        city: "Mogadishu",
        page: 2,
        status: "ACTIVE",
      },
    });
    expect(result).toEqual({ results: [propertyRecord], count: 21 });
  });

  it("uses the archive action rather than a destructive delete request", async () => {
    apiMock.post.mockResolvedValue({ data: propertyRecord });

    await archiveProperty(propertyRecord.id);

    expect(apiMock.post).toHaveBeenCalledWith(
      `properties/${propertyRecord.id}/archive/`,
    );
  });
});
