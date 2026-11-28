import type { BadgeVariant } from "../components/ui/Badge";

export type StatusSemantic = BadgeVariant;

export const STATUS_CATALOG: Readonly<Record<string, StatusSemantic>> = {
  ACTIVE: "success",
  APPROVED: "success",
  ACCEPTED: "success",
  CLOSED: "success",
  COMPLETED: "success",
  PAID: "success",
  PASSED: "success",
  PUBLISHED: "success",
  RESOLVED: "success",
  RENEWED: "success",
  SUCCESS: "success",
  HIGH: "danger",
  URGENT: "danger",
  MEDIUM: "warning",
  LOW: "info",
  CREATED: "info",
  STARTED: "warning",
  UPDATED: "neutral",

  ASSIGNED: "warning",
  EXPIRING: "warning",
  IN_PROGRESS: "warning",
  NEEDS_REVIEW: "warning",
  PARTIALLY_PAID: "warning",
  PARTIALLY_REFUNDED: "warning",
  PENDING: "warning",
  PENDING_APPROVAL: "warning",
  SCREENING: "warning",
  UNDER_REVIEW: "warning",
  UNREAD: "warning",
  WARNING: "warning",

  CANCELLED: "danger",
  CANCELED: "danger",
  EXPIRED: "danger",
  FAILED: "danger",
  FORFEITED: "danger",
  INACTIVE: "danger",
  MOVED_OUT: "danger",
  OVERDUE: "danger",
  REJECTED: "danger",
  REVOKED: "danger",
  REVERSED: "danger",
  TERMINATED: "danger",
  WITHDRAWN: "danger",
  DANGER: "danger",

  AVAILABLE: "info",
  DRAFT: "info",
  INFO: "info",
  LISTED: "info",
  OPEN: "info",
  READ: "info",
  RESERVED: "info",
  SUBMITTED: "info",
  OCCUPIED: "info",
  MAINTENANCE: "info",

  ARCHIVED: "neutral",
  PAUSED: "neutral",
};

export function normalizeStatus(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function normalizeStatusKey(status: string): string {
  return status
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toUpperCase();
}

export function getStatusSemantic(status: string): StatusSemantic {
  return STATUS_CATALOG[normalizeStatusKey(status)] ?? "neutral";
}
