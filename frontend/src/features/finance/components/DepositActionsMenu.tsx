import {
  ActionDropdown,
  type ActionDropdownItem,
} from "../../../components/overlays/ActionDropdown";
import type { Deposit } from "../types/finance";
import { getDepositActions, type DepositAction } from "../utils/actions";

const LABELS: Record<DepositAction, string> = {
  "record-payment": "Record payment",
  refund: "Refund deposit",
  forfeit: "Forfeit deposit",
};

export interface DepositActionsMenuProps {
  deposit: Deposit;
  onAction: (action: DepositAction) => void;
  onView?: () => void;
}

export function DepositActionsMenu({
  deposit,
  onAction,
  onView,
}: DepositActionsMenuProps) {
  const items: ActionDropdownItem[] = [
    ...(onView
      ? [{ id: "view", label: "View details", onSelect: onView }]
      : []),
    ...getDepositActions(deposit).map((action) => ({
      id: action,
      label: LABELS[action],
      onSelect: () => onAction(action),
      variant: action === "forfeit" ? "danger" as const : "ghost" as const,
    })),
  ];

  return items.length > 0 ? (
    <ActionDropdown
      label={`Deposit actions for lease ${deposit.lease.slice(0, 8)}`}
      items={items}
    />
  ) : null;
}
