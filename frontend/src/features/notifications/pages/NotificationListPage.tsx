import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Breadcrumbs,
  PageHeader,
  Pagination,
  SearchFilterBar,
  type FilterDefinition,
} from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Button } from "../../../components/ui/Button";
import { toastService } from "../../../services/toastService";
import {
  getNotificationErrorMessage,
} from "../api/notifications.api";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from "../hooks/useNotifications";
import {
  NOTIFICATION_TYPES,
  type NotificationType,
} from "../types/notification";
import { NotificationList } from "../components/NotificationList";

const PAGE_SIZE = 20;

function isNotificationType(value: string): value is NotificationType {
  return NOTIFICATION_TYPES.some((type) => type === value);
}

function parsePage(value: string | null): number {
  const page = Number(value ?? "1");
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function formatType(type: NotificationType): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

export function NotificationListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const rawType = searchParams.get("type") ?? "";
  const type = isNotificationType(rawType) ? rawType : "";
  const rawIsRead = searchParams.get("is_read") ?? "";
  const isRead =
    rawIsRead === "true" ? true : rawIsRead === "false" ? false : undefined;
  const page = parsePage(searchParams.get("page"));
  const [searchDraft, setSearchDraft] = useState({
    sourceSearch: search,
    value: search,
  });
  const searchValue =
    searchDraft.sourceSearch === search ? searchDraft.value : search;
  const notificationsQuery = useNotifications({
    search: search || undefined,
    type: type || undefined,
    is_read: isRead,
    page,
    page_size: PAGE_SIZE,
  });
  const unreadCountQuery = useUnreadNotificationCount();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const notifications = notificationsQuery.data?.results ?? [];

  const filters: FilterDefinition[] = [
    {
      id: "is_read",
      label: "Read status",
      type: "select",
      value: rawIsRead === "true" || rawIsRead === "false" ? rawIsRead : "",
      options: [
        { value: "false", label: "Unread" },
        { value: "true", label: "Read" },
      ],
      placeholder: "All notifications",
    },
    {
      id: "type",
      label: "Type",
      type: "select",
      value: type,
      options: NOTIFICATION_TYPES.map((value) => ({
        value,
        label: formatType(value),
      })),
      placeholder: "All types",
    },
  ];

  function updateQueryParameter(name: string, value: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(name, value);
        else next.delete(name);
        if (name !== "page") next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function handleFilterChange(filterId: string, value: string) {
    if (filterId === "type") {
      updateQueryParameter(
        "type",
        isNotificationType(value) ? value : "",
      );
    } else if (filterId === "is_read") {
      updateQueryParameter(
        "is_read",
        value === "true" || value === "false" ? value : "",
      );
    }
  }

  function resetFilters() {
    setSearchDraft({ sourceSearch: "", value: "" });
    setSearchParams({}, { replace: true });
  }

  function markAllRead() {
    markAllReadMutation.mutate(undefined, {
      onSuccess: (updatedCount) => {
        if (updatedCount > 0) {
          toastService.success(
            `${updatedCount} notification${updatedCount === 1 ? "" : "s"} marked as read.`,
          );
        }
      },
    });
  }

  const isFiltered = Boolean(search || type || rawIsRead);

  return (
    <div className="space-y-6 py-6">
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Notifications" },
        ]}
      />
      <PageHeader
        title="Notifications"
        subtitle="Review updates for your account."
        actions={
          <Button
            type="button"
            variant="secondary"
            disabled={
              markAllReadMutation.isPending ||
              unreadCountQuery.data === 0
            }
            isLoading={markAllReadMutation.isPending}
            onClick={markAllRead}
          >
            Mark all read
          </Button>
        }
      />
      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={(value) =>
          setSearchDraft({ sourceSearch: search, value })
        }
        onSearch={(value) => updateQueryParameter("search", value.trim())}
        searchLabel="Search notifications"
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />

      {notificationsQuery.isLoading ? (
        <LoadingState message="Loading notifications..." />
      ) : notificationsQuery.isError ? (
        <ErrorState
          title="Unable to load notifications"
          description={getNotificationErrorMessage(notificationsQuery.error)}
          onRetry={() => void notificationsQuery.refetch()}
        />
      ) : (
        <>
          <NotificationList
            notifications={notifications}
            onMarkRead={(id) => markReadMutation.mutate(id)}
            pendingReadId={
              markReadMutation.isPending
                ? markReadMutation.variables
                : undefined
            }
            emptyTitle={
              isFiltered ? "No matching notifications" : "No notifications"
            }
            emptyDescription={
              isFiltered
                ? "Try changing or clearing the selected filters."
                : "Notifications for your account will appear here."
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={notificationsQuery.data?.count ?? 0}
            onPageChange={(nextPage) =>
              updateQueryParameter("page", String(nextPage))
            }
          />
        </>
      )}
    </div>
  );
}
