import {
  ActionDropdown,
  type ActionDropdownItem,
} from "../../../components/overlays/ActionDropdown";
import type { RentCharge } from "../types/finance";
import { getBusinessDate } from "../utils/actions";

export type RentChargeAction = "mark-overdue" | "issue-invoice";

export interface RentChargeActionsMenuProps {
  charge: RentCharge;
  canManage: boolean;
  onAction: (action: RentChargeAction) => void;
  onView?: () => void;
}

export function RentChargeActionsMenu({
  canManage,
  charge,
  onAction,
  onView,
}: RentChargeActionsMenuProps) {
  const canMarkOverdue =
    canManage &&
    charge.status !== "PAID" &&
    charge.status !== "CANCELLED" &&
    charge.due_date < getBusinessDate();
  const items: ActionDropdownItem[] = [
    ...(onView
      ? [{ id: "view", label: "View details", onSelect: onView }]
      : []),
    ...(canMarkOverdue
      ? [
          {
            id: "mark-overdue",
            label: "Mark overdue",
            onSelect: () => onAction("mark-overdue"),
          },
        ]
      : []),
    ...(canManage && !charge.invoice_number
      ? [
          {
            id: "issue-invoice",
            label: "Issue invoice",
            onSelect: () => onAction("issue-invoice"),
          },
        ]
      : []),
  ];

  return items.length > 0 ? (
    <ActionDropdown
      label={`Charge actions for ${charge.billing_month}/${charge.billing_year}`}
      items={items}
    />
  ) : null;
}
