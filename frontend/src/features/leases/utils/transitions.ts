import type { LeaseAction, LeaseDetails, LeaseStatus } from "../types/lease";

export function getBusinessDate(): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Mogadishu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const partValues = new Map(parts.map((part) => [part.type, part.value]));
  return `${partValues.get("year")}-${partValues.get("month")}-${partValues.get("day")}`;
}

export function getLeaseAvailableActions(
  lease: Pick<LeaseDetails, "status" | "end_date">,
  today = getBusinessDate(),
): LeaseAction[] {
  if (lease.status === "DRAFT") return ["submit-for-approval"];
  if (lease.status === "PENDING_APPROVAL") return ["approve"];
  if (lease.status === "APPROVED") return ["activate"];
  if (lease.status === "ACTIVE" || lease.status === "EXPIRING") {
    const actions: LeaseAction[] = ["renew", "terminate"];
    if (lease.end_date < today) actions.push("expire");
    return actions;
  }
  return [];
}

export function isLeaseStatus(value: string): value is LeaseStatus {
  return [
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "ACTIVE",
    "EXPIRING",
    "RENEWED",
    "TERMINATED",
    "EXPIRED",
  ].some((status) => status === value);
}

export function addDaysToDate(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
