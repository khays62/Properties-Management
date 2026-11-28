import { Link } from "react-router-dom";

import { Button } from "../../../components/ui/Button";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import {
  getNotificationErrorMessage,
} from "../api/notifications.api";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../hooks/useNotifications";
import { NotificationList } from "./NotificationList";

export interface NotificationDropdownProps {
  onClose: () => void;
}

export function NotificationDropdown({ onClose }: NotificationDropdownProps) {
  const notificationsQuery = useNotifications({ page: 1, page_size: 5 });
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const notifications = notificationsQuery.data?.results ?? [];

  return (
    <section
      id="notification-dropdown"
      role="dialog"
      aria-label="Recent notifications"
      className="absolute right-0 top-full z-[var(--z-index-dropdown)] mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-[var(--color-border)] bg-card shadow-xl"
    >
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <h2 className="text-sm font-semibold text-text-primary">
          Notifications
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          isLoading={markAllReadMutation.isPending}
          onClick={() => markAllReadMutation.mutate()}
        >
          Mark all read
        </Button>
      </div>

      <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
        {notificationsQuery.isLoading ? (
          <LoadingState message="Loading notifications..." />
        ) : notificationsQuery.isError ? (
          <ErrorState
            title="Unable to load notifications"
            description={getNotificationErrorMessage(notificationsQuery.error)}
            onRetry={() => void notificationsQuery.refetch()}
          />
        ) : (
          <NotificationList
            notifications={notifications}
            onMarkRead={(id) => markReadMutation.mutate(id)}
            pendingReadId={
              markReadMutation.isPending
                ? markReadMutation.variables
                : undefined
            }
            emptyTitle="You're all caught up"
            emptyDescription="New notifications will appear here."
          />
        )}
      </div>

      <div className="border-t border-[var(--color-border)] p-3 text-center">
        <Link
          to="/notifications"
          onClick={onClose}
          className="text-sm font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
        >
          View all notifications
        </Link>
      </div>
    </section>
  );
}
