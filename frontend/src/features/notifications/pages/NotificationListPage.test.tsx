import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";

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

import { NotificationListPage } from "./NotificationListPage";

const notification = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  title: "Rent charge update",
  type: "LEASE" as const,
  is_read: false,
  created_at: "2026-11-26T00:00:00Z",
};

const markRead = vi.fn();
const markAllRead = vi.fn();

function LocationSearch() {
  const location = useLocation();
  return <output data-testid="location-search">{location.search}</output>;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.useNotifications.mockReturnValue({
    data: { count: 21, results: [notification] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useUnreadNotificationCount.mockReturnValue({
    data: 1,
    isError: false,
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

afterEach(() => cleanup());

describe("NotificationListPage", () => {
  it("uses supported URL filters and allows read actions", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter
        initialEntries={[
          "/notifications?is_read=false&type=LEASE&search=rent&page=2",
        ]}
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
      >
        <NotificationListPage />
        <LocationSearch />
      </MemoryRouter>,
    );

    expect(mocks.useNotifications).toHaveBeenLastCalledWith({
      is_read: false,
      type: "LEASE",
      search: "rent",
      page: 2,
      page_size: 20,
    });

    fireEvent.change(screen.getByLabelText("Read status"), {
      target: { value: "true" },
    });
    expect(screen.getByTestId("location-search")).toHaveTextContent(
      "?is_read=true&type=LEASE&search=rent",
    );

    await user.click(screen.getByRole("button", { name: "Mark all read" }));
    expect(markAllRead).toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Mark Rent charge update as read" }),
    );
    expect(markRead).toHaveBeenCalledWith(notification.id);
  });
});
