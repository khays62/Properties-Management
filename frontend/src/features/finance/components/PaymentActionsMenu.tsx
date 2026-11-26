import {
  ActionDropdown,
  type ActionDropdownItem,
} from "../../../components/overlays/ActionDropdown";
import type { PaymentAction } from "../utils/actions";
import { getPaymentActions } from "../utils/actions";
import type { PaymentDetails } from "../types/finance";

const LABELS: Record<PaymentAction, string> = {
  allocate: "Allocate payment",
  reverse: "Reverse payment",
};

export interface PaymentActionsMenuProps {
  payment: PaymentDetails;
  onAction: (action: PaymentAction) => void;
  onView?: () => void;
}

export function PaymentActionsMenu({
  onAction,
  onView,
  payment,
}: PaymentActionsMenuProps) {
  const items: ActionDropdownItem[] = [
    ...(onView
      ? [{ id: "view", label: "View details", onSelect: onView }]
      : []),
    ...getPaymentActions(payment).map((action) => ({
      id: action,
      label: LABELS[action],
      onSelect: () => onAction(action),
      variant: action === "reverse" ? "danger" as const : "ghost" as const,
    })),
  ];

  return items.length > 0 ? (
    <ActionDropdown
      label={`Payment actions for ${payment.reference_number}`}
      items={items}
    />
  ) : null;
}
