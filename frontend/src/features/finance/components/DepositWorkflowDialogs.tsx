import { ConfirmDialog } from "../../../components/overlays/ConfirmDialog";
import { toastService } from "../../../services/toastService";
import { getFinanceErrorMessage } from "../api/finance.api";
import {
  useForfeitDeposit,
  useRecordDepositPayment,
  useRefundDeposit,
} from "../hooks/useFinance";
import type { Deposit, DepositPaymentInput, DepositRefundInput } from "../types/finance";
import type { DepositAction } from "../utils/actions";
import { DepositPaymentModal } from "./DepositPaymentModal";
import { DepositRefundModal } from "./DepositRefundModal";

export interface DepositWorkflowDialogsProps {
  deposit: Deposit | null;
  action: DepositAction | null;
  onClose: () => void;
}

export function DepositWorkflowDialogs({
  action,
  deposit,
  onClose,
}: DepositWorkflowDialogsProps) {
  const recordMutation = useRecordDepositPayment();
  const refundMutation = useRefundDeposit();
  const forfeitMutation = useForfeitDeposit();

  async function recordPayment(values: DepositPaymentInput) {
    if (!deposit) return;
    await recordMutation.mutateAsync({ id: deposit.id, values });
  }

  async function refund(values: DepositRefundInput) {
    if (!deposit) return;
    await refundMutation.mutateAsync({ id: deposit.id, values });
  }

  async function forfeit() {
    if (!deposit) return;
    try {
      await forfeitMutation.mutateAsync(deposit.id);
      toastService.success("Deposit forfeited.");
      onClose();
    } catch (error) {
      toastService.error(getFinanceErrorMessage(error));
    }
  }

  if (!deposit || !action) return null;
  if (action === "record-payment") {
    return (
      <DepositPaymentModal
        key={`deposit-payment-${deposit.id}`}
        deposit={deposit}
        isSaving={recordMutation.isPending}
        onClose={onClose}
        onSave={recordPayment}
        onSaved={() => toastService.success("Deposit payment recorded.")}
      />
    );
  }
  if (action === "refund") {
    return (
      <DepositRefundModal
        key={`deposit-refund-${deposit.id}`}
        deposit={deposit}
        isSaving={refundMutation.isPending}
        onClose={onClose}
        onSave={refund}
        onSaved={() => toastService.success("Deposit refund recorded.")}
      />
    );
  }

  return (
    <ConfirmDialog
      open
      title="Forfeit deposit"
      description="This records the collected deposit as forfeited. This action is available only for eligible deposits."
      confirmLabel="Forfeit deposit"
      confirmVariant="danger"
      isLoading={forfeitMutation.isPending}
      error={
        forfeitMutation.isError
          ? getFinanceErrorMessage(forfeitMutation.error)
          : undefined
      }
      onClose={onClose}
      onConfirm={() => void forfeit()}
    />
  );
}
