import type {
  MaintenanceAction,
  MaintenanceStatus,
  MaintenanceTicket,
} from "../types/maintenance";

export function getMaintenanceActions(
  ticket: Pick<MaintenanceTicket, "status" | "tenant">,
  isManager: boolean,
): MaintenanceAction[] {
  switch (ticket.status) {
    case "OPEN":
      return [
        ...(isManager ? (["assign"] as const) : []),
        "cancel",
      ];
    case "ASSIGNED":
      return isManager ? ["start"] : [];
    case "IN_PROGRESS":
      return isManager ? ["resolve"] : [];
    case "RESOLVED":
      return isManager ? ["close"] : [];
    default:
      return [];
  }
}

export function isMaintenanceStatus(value: string): value is MaintenanceStatus {
  return [
    "OPEN",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
    "CANCELLED",
  ].some((status) => status === value);
}

export function getMaintenanceActionLabel(action: MaintenanceAction): string {
  const labels: Record<MaintenanceAction, string> = {
    assign: "Assign",
    start: "Start work",
    resolve: "Resolve",
    close: "Close ticket",
    cancel: "Cancel ticket",
  };
  return labels[action];
}
