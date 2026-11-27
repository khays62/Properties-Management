import { Button } from "../../../components/ui/Button";
import type { AppNotification } from "../types/notification";

export interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead?: (notificationId: string) => void;
  isMarkingRead?: boolean;
}

function formatType(type: string): string {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function NotificationItem({
  isMarkingRead = false,
  notification,
  onMarkRead,
}: NotificationItemProps) {
  return (
    <li
      className={[
        "flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0",
        notification.is_read ? "bg-card" : "bg-blue-50/50",
      ].join(" ")}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          {!notification.is_read && (
            <span
              aria-label="Unread"
              className="h-2 w-2 shrink-0 rounded-full bg-omni-blue"
            />
          )}
          <h3 className="truncate text-sm font-semibold text-text-primary">
            {notification.title}
          </h3>
        </div>
        <p className="text-xs text-text-secondary">
          {formatType(notification.type)} · {formatCreatedAt(notification.created_at)}
        </p>
      </div>
      {!notification.is_read && onMarkRead && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          isLoading={isMarkingRead}
          aria-label={`Mark ${notification.title} as read`}
          onClick={() => onMarkRead(notification.id)}
          className="shrink-0"
        >
          Mark read
        </Button>
      )}
    </li>
  );
}
