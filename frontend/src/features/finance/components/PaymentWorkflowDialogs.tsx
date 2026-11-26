import { ConfirmDialog } from "../../../components/overlays/ConfirmDialog";
import { toastService } from "../../../services/toastService";
import { getFinanceErrorMessage } from "../api/finance.api";
import { useAllocatePayment, useReversePayment } from "../hooks/useFinance";
import type { PaymentDetails, AllocatePaymentInput } from "../types/finance";
import type { PaymentAction } from "../utils/actions";
import { PaymentAllocationModal } from "./PaymentAllocationModal";

export interface PaymentWorkflowDialogsProps {
  payment: PaymentDetails | null;
  action: PaymentAction | null;
  onClose: () => void;
}

export function PaymentWorkflowDialogs({
  action,
  onClose,
  payment,
}: PaymentWorkflowDialogsProps) {
  const allocateMutation = useAllocatePayment();
  const reverseMutation = useReversePayment();

  async function allocate(values: AllocatePaymentInput) {
    if (!payment) return;
    await allocateMutation.mutateAsync({ id: payment.id, values });
  }

  async function reverse() {
    if (!payment) return;
    try {
      await reverseMutation.mutateAsync(payment.id);
      toastService.success("Payment reversed. The receipt and allocation history are retained.");
      onClose();
    } catch (error) {
      toastService.error(getFinanceErrorMessage(error));
    }
  }

  if (!payment || !action) return null;
  if (action === "allocate") {
    return (
      <PaymentAllocationModal
        key={`payment-allocation-${payment.id}`}
        payment={payment}
        isSaving={allocateMutation.isPending}
        onClose={onClose}
        onSave={allocate}
        onSaved={() => toastService.success("Payment allocated and receipt generated.")}
      />
    );
  }

  return (
    <ConfirmDialog
      open
      title="Reverse payment"
      description="The backend will reverse this completed payment and restore the associated rent-charge balances. The receipt and allocation history remain available."
      confirmLabel="Reverse payment"
      confirmVariant="danger"
      isLoading={reverseMutation.isPending}
      error={
        reverseMutation.isError
          ? getFinanceErrorMessage(reverseMutation.error)
          : undefined
      }
      onClose={onClose}
      onConfirm={() => void reverse()}
    />
  );
}
