import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../../services/api", () => ({ api: apiMock }));

import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "./notifications.api";

const notificationRecord = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  title: "Lease update",
  type: "LEASE",
  is_read: false,
  created_at: "2026-11-26T00:00:00Z",
};

describe("notification API", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("requests only the current user's unread notifications with supported filters", async () => {
    apiMock.get.mockResolvedValue({
      data: { count: 1, results: [notificationRecord] },
    });

    const result = await fetchNotifications({
      is_read: false,
      search: "lease",
      type: "LEASE",
      page: 2,
    });

    expect(apiMock.get).toHaveBeenCalledWith("notifications/", {
      params: {
        page_size: 20,
        is_read: false,
        search: "lease",
        type: "LEASE",
        page: 2,
      },
    });
    expect(result).toEqual({ count: 1, results: [notificationRecord] });
  });

  it("uses the existing mark-read and mark-all-read actions", async () => {
    apiMock.post
      .mockResolvedValueOnce({
        data: { ...notificationRecord, is_read: true },
      })
      .mockResolvedValueOnce({ data: { updated_count: 3 } });

    const marked = await markNotificationRead(notificationRecord.id);
    const updatedCount = await markAllNotificationsRead();

    expect(apiMock.post).toHaveBeenNthCalledWith(
      1,
      `notifications/${notificationRecord.id}/mark-read/`,
      {},
    );
    expect(apiMock.post).toHaveBeenNthCalledWith(
      2,
      "notifications/mark-all-read/",
      {},
    );
    expect(marked).toMatchObject({ id: notificationRecord.id, is_read: true });
    expect(updatedCount).toBe(3);
  });
});
