import type {
  RenewalAlert,
  RenewalAlertAction,
  RenewalAlertStatus,
} from "../types/renewal";

const RENEWAL_STATUSES: readonly RenewalAlertStatus[] = [
  "UNREAD",
  "READ",
  "RESOLVED",
];

export function isRenewalAlertStatus(
  value: string,
): value is RenewalAlertStatus {
  return RENEWAL_STATUSES.some((status) => status === value);
}

export function getRenewalAlertActions(
  alert: Pick<RenewalAlert, "status">,
  canManage: boolean,
): RenewalAlertAction[] {
  if (!canManage || alert.status === "RESOLVED") return [];
  return alert.status === "UNREAD"
    ? ["mark-read", "resolve"]
    : ["resolve"];
}

export function getRenewalAlertActionLabel(
  action: RenewalAlertAction,
): string {
  return action === "mark-read" ? "Mark as read" : "Resolve alert";
}
