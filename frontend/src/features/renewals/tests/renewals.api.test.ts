import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../../services/api", () => ({
  api: { get, post },
}));

import {
  fetchRenewalAlerts,
  generateRenewalAlerts,
  markRenewalAlertRead,
  resolveRenewalAlert,
} from "../api/renewals.api";

const alert = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  lease: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  alert_date: "2026-11-26",
  days_before_expiry: 90,
  status: "UNREAD",
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("renewal alerts API", () => {
  it("sends only backend-supported alert filters", async () => {
    get.mockResolvedValue({
      data: { count: 1, results: [alert] },
    });

    await expect(
      fetchRenewalAlerts({
        status: "UNREAD",
        lease: alert.lease,
        property: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
        page: 2,
        page_size: 20,
      }),
    ).resolves.toMatchObject({ count: 1 });

    expect(get).toHaveBeenCalledWith("renewal-alerts/", {
      params: {
        status: "UNREAD",
        lease: alert.lease,
        property: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
        page: 2,
        page_size: 20,
      },
    });
  });

  it("uses the backend generate, mark-read, and resolve actions", async () => {
    post
      .mockResolvedValueOnce({ data: [alert] })
      .mockResolvedValueOnce({ data: { ...alert, status: "READ" } })
      .mockResolvedValueOnce({ data: { ...alert, status: "RESOLVED" } });

    await expect(generateRenewalAlerts()).resolves.toHaveLength(1);
    await expect(markRenewalAlertRead(alert.id)).resolves.toMatchObject({
      status: "READ",
    });
    await expect(resolveRenewalAlert(alert.id)).resolves.toMatchObject({
      status: "RESOLVED",
    });

    expect(post).toHaveBeenNthCalledWith(1, "renewal-alerts/generate/", {});
    expect(post).toHaveBeenNthCalledWith(
      2,
      `renewal-alerts/${alert.id}/mark-read/`,
      {},
    );
    expect(post).toHaveBeenNthCalledWith(
      3,
      `renewal-alerts/${alert.id}/resolve/`,
      {},
    );
  });
});
