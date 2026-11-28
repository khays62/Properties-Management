import {
  ActionDropdown,
  type ActionDropdownItem,
} from "../../../components/overlays/ActionDropdown";
import type {
  MaintenanceAction,
  MaintenanceTicket,
} from "../types/maintenance";
import { getMaintenanceActions, getMaintenanceActionLabel } from "../utils/workflow";

export interface MaintenanceActionsMenuProps {
  ticket: MaintenanceTicket;
  isManager: boolean;
  onAction: (action: MaintenanceAction) => void;
  onView?: () => void;
}

export function MaintenanceActionsMenu({
  isManager,
  onAction,
  onView,
  ticket,
}: MaintenanceActionsMenuProps) {
  const items: ActionDropdownItem[] = [
    ...(onView ? [{ id: "view", label: "View details", onSelect: onView }] : []),
    ...getMaintenanceActions(ticket, isManager).map((action) => ({
      id: action,
      label: getMaintenanceActionLabel(action),
      onSelect: () => onAction(action),
      variant: action === "cancel" ? "danger" as const : "ghost" as const,
    })),
  ];

  return items.length > 0 ? (
    <ActionDropdown
      label={`Actions for maintenance ticket ${ticket.title}`}
      items={items}
    />
  ) : null;
}
