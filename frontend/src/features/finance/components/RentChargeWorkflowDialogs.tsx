import { ConfirmDialog } from "../../../components/overlays/ConfirmDialog";
import { toastService } from "../../../services/toastService";
import { getFinanceErrorMessage } from "../api/finance.api";
import {
  useIssueRentChargeInvoice,
  useMarkRentChargeOverdue,
} from "../hooks/useFinance";
import type { RentCharge } from "../types/finance";
import type { RentChargeAction } from "./RentChargeActionsMenu";

export interface RentChargeWorkflowDialogsProps {
  charge: RentCharge | null;
  action: RentChargeAction | null;
  onClose: () => void;
}

export function RentChargeWorkflowDialogs({
  action,
  charge,
  onClose,
}: RentChargeWorkflowDialogsProps) {
  const overdueMutation = useMarkRentChargeOverdue();
  const invoiceMutation = useIssueRentChargeInvoice();

  async function confirmAction() {
    if (!charge || !action) return;
    try {
      if (action === "mark-overdue") {
        await overdueMutation.mutateAsync(charge.id);
        toastService.success("Rent charge marked overdue.");
      } else {
        const invoice = await invoiceMutation.mutateAsync(charge.id);
        toastService.success(`Invoice ${invoice.invoice_number} issued.`);
      }
      onClose();
    } catch {
      // Mutation errors are displayed in the confirmation dialog.
    }
  }

  if (!charge || !action) return null;
  const isOverdue = action === "mark-overdue";
  const error = overdueMutation.isError
    ? getFinanceErrorMessage(overdueMutation.error)
    : invoiceMutation.isError
      ? getFinanceErrorMessage(invoiceMutation.error)
      : undefined;

  return (
    <ConfirmDialog
      open
      title={isOverdue ? "Mark rent charge overdue" : "Issue invoice"}
      description={
        isOverdue
          ? "The backend will mark this charge overdue only if its due date has passed and an outstanding balance remains."
          : "Issue an invoice for this rent charge. The backend returns the existing invoice if one has already been issued."
      }
      confirmLabel={isOverdue ? "Mark overdue" : "Issue invoice"}
      isLoading={overdueMutation.isPending || invoiceMutation.isPending}
      error={error}
      onClose={onClose}
      onConfirm={() => void confirmAction()}
    />
  );
}
