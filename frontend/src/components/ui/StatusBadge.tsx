import type { BadgeProps, BadgeVariant } from "./Badge";
import { Badge } from "./Badge";

export interface StatusBadgeProps extends Omit<BadgeProps, "children"> {
  status: string;
  label?: string;
}

const SUCCESS_STATUSES = new Set([
  "active",
  "approved",
  "closed",
  "completed",
  "paid",
  "passed",
  "published",
  "resolved",
  "success",
]);
const WARNING_STATUSES = new Set([
  "assigned",
  "expiring",
  "in progress",
  "in_progress",
  "partially paid",
  "partially_paid",
  "pending",
  "screening",
  "under review",
  "under_review",
  "warning",
]);
const DANGER_STATUSES = new Set([
  "cancelled",
  "canceled",
  "danger",
  "expired",
  "failed",
  "forfeited",
  "overdue",
  "rejected",
  "reversed",
  "terminated",
]);
const INFO_STATUSES = new Set([
  "available",
  "draft",
  "info",
  "listed",
  "open",
  "submitted",
]);

function getStatusVariant(status: string): BadgeVariant {
  const normalizedStatus = status.trim().toLowerCase();
  if (SUCCESS_STATUSES.has(normalizedStatus)) return "success";
  if (WARNING_STATUSES.has(normalizedStatus)) return "warning";
  if (DANGER_STATUSES.has(normalizedStatus)) return "danger";
  if (INFO_STATUSES.has(normalizedStatus)) return "info";
  return "neutral";
}

function formatStatus(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function StatusBadge({
  label,
  status,
  variant,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      {...props}
      variant={variant ?? getStatusVariant(status)}
      aria-label={props["aria-label"] ?? `${formatStatus(status)} status`}
    >
      {label ?? formatStatus(status)}
    </Badge>
  );
}
