import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useMarkAllNotificationsRead: vi.fn(),
  useMarkNotificationRead: vi.fn(),
  useNotifications: vi.fn(),
  useUnreadNotificationCount: vi.fn(),
}));

vi.mock("../hooks/useNotifications", () => ({
  useMarkAllNotificationsRead: mocks.useMarkAllNotificationsRead,
  useMarkNotificationRead: mocks.useMarkNotificationRead,
  useNotifications: mocks.useNotifications,
  useUnreadNotificationCount: mocks.useUnreadNotificationCount,
}));

import { NotificationBell } from "./NotificationBell";

const notification = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  title: "Lease update",
  type: "LEASE" as const,
  is_read: false,
  created_at: "2026-11-26T00:00:00Z",
};

const markRead = vi.fn();
const markAllRead = vi.fn();

function renderBell() {
  return render(
    <MemoryRouter
      future={{
        v7_relativeSplatPath: true,
        v7_startTransition: true,
      }}
    >
      <NotificationBell />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useUnreadNotificationCount.mockReturnValue({
    data: 3,
    isError: false,
  });
  mocks.useNotifications.mockReturnValue({
    data: { count: 1, results: [notification] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useMarkNotificationRead.mockReturnValue({
    isPending: false,
    mutate: markRead,
  });
  mocks.useMarkAllNotificationsRead.mockReturnValue({
    isPending: false,
    mutate: markAllRead,
  });
});

afterEach(() => {
  cleanup();
});

describe("NotificationBell", () => {
  it("shows the unread count and exposes mark-read actions in the dropdown", async () => {
    const user = userEvent.setup();
    renderBell();

    const bell = screen.getByRole("button", {
      name: "Notifications, 3 unread",
    });
    expect(bell).toBeVisible();
    expect(await screen.findByText("3")).toBeVisible();

    await user.click(bell);
    expect(
      screen.getByRole("dialog", { name: "Recent notifications" }),
    ).toBeVisible();
    expect(screen.getByText("Lease update")).toBeVisible();

    await user.click(
      screen.getByRole("button", { name: "Mark Lease update as read" }),
    );
    expect(markRead).toHaveBeenCalledWith(notification.id);

    await user.click(screen.getByRole("button", { name: "Mark all read" }));
    await waitFor(() => expect(markAllRead).toHaveBeenCalled());
    expect(screen.getByRole("link", { name: "View all notifications" })).toHaveAttribute(
      "href",
      "/notifications",
    );
  });

  it("shows the shared empty state when the account has no notifications", async () => {
    const user = userEvent.setup();
    mocks.useNotifications.mockReturnValue({
      data: { count: 0, results: [] },
      error: null,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    mocks.useUnreadNotificationCount.mockReturnValue({
      data: 0,
      isError: false,
    });
    renderBell();

    await user.click(screen.getByRole("button", { name: "Notifications" }));
    expect(await screen.findByText("You're all caught up")).toBeVisible();
  });
});
