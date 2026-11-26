import {
  ActionDropdown,
  type ActionDropdownItem,
} from "../../../components/overlays/ActionDropdown";
import type {
  RenewalAlert,
  RenewalAlertAction,
} from "../types/renewal";
import {
  getRenewalAlertActionLabel,
  getRenewalAlertActions,
} from "../utils/actions";

export interface RenewalAlertActionsMenuProps {
  alert: RenewalAlert;
  canManage: boolean;
  isPending?: boolean;
  onAction: (action: RenewalAlertAction) => void;
}

export function RenewalAlertActionsMenu({
  alert,
  canManage,
  isPending = false,
  onAction,
}: RenewalAlertActionsMenuProps) {
  const items: ActionDropdownItem[] = getRenewalAlertActions(
    alert,
    canManage,
  ).map((action) => ({
    id: action,
    label: getRenewalAlertActionLabel(action),
    onSelect: () => onAction(action),
    disabled: isPending,
    variant: action === "resolve" ? "danger" : "ghost",
  }));

  return items.length > 0 ? (
    <ActionDropdown
      label={`Actions for renewal alert ${alert.id.slice(0, 8)}`}
      items={items}
    />
  ) : null;
}
