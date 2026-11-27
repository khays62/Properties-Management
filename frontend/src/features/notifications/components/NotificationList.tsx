import { EmptyState } from "../../../components/feedback/EmptyState";
import type { AppNotification } from "../types/notification";
import { NotificationItem } from "./NotificationItem";

export interface NotificationListProps {
  notifications: readonly AppNotification[];
  onMarkRead?: (notificationId: string) => void;
  pendingReadId?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function NotificationList({
  emptyDescription = "You don't have any notifications yet.",
  emptyTitle = "No notifications",
  notifications,
  onMarkRead,
  pendingReadId,
}: NotificationListProps) {
  if (notifications.length === 0) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    );
  }

  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-card">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onMarkRead={onMarkRead}
          isMarkingRead={pendingReadId === notification.id}
        />
      ))}
    </ul>
  );
}
