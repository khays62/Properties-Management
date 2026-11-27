import {
  ActionDropdown,
  type ActionDropdownItem,
} from "../../../components/overlays/ActionDropdown";
import type { LeaseAction, LeaseDetails } from "../types/lease";
import { getLeaseAvailableActions } from "../utils/transitions";

const ACTION_LABELS: Record<LeaseAction, string> = {
  "submit-for-approval": "Submit for approval",
  approve: "Approve",
  activate: "Activate",
  renew: "Renew",
  terminate: "Terminate",
  expire: "Expire",
};

export interface LeaseActionsMenuProps {
  lease: LeaseDetails;
  onView?: () => void;
  canManageActions?: boolean;
  onAction: (action: LeaseAction) => void;
}

export function LeaseActionsMenu({
  lease,
  onAction,
  onView,
  canManageActions = true,
}: LeaseActionsMenuProps) {
  const actionItems: ActionDropdownItem[] = canManageActions
    ? getLeaseAvailableActions(lease).map((action) => ({
        id: action,
        label: ACTION_LABELS[action],
        onSelect: () => onAction(action),
        variant:
          action === "terminate" || action === "expire" ? "danger" : "ghost",
      }))
    : [];
  const items = [
    ...(onView
      ? [
          {
            id: "view",
            label: "View details",
            onSelect: onView,
          },
        ]
      : []),
    ...actionItems,
  ] satisfies ActionDropdownItem[];

  if (items.length === 0) return null;

  return <ActionDropdown label={`Lease actions for ${lease.id}`} items={items} />;
}
