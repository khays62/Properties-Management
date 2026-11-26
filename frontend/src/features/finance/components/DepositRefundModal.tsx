import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CurrencyField } from "../../../components/form";
import { FormModal } from "../../../components/overlays/FormModal";
import type { Deposit, DepositRefundInput } from "../types/finance";
import { getFinanceErrorMessage } from "../api/finance.api";

const schema = z.object({
  amount: z
    .string()
    .refine(
      (value) =>
        value === "" ||
        (/^\d{1,10}(?:\.\d{1,2})?$/.test(value) && Number(value) > 0),
      "Enter a positive amount or leave blank for the full remaining refund.",
    ),
});

type FormValues = z.infer<typeof schema>;

export interface DepositRefundModalProps {
  deposit: Deposit | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: DepositRefundInput) => Promise<unknown>;
  onSaved?: () => void;
}

export function DepositRefundModal({
  deposit,
  isSaving = false,
  onClose,
  onSave,
  onSaved,
}: DepositRefundModalProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "" },
  });

  useEffect(() => {
    if (deposit) reset({ amount: "" });
  }, [deposit, reset]);

  function close() {
    setSubmissionError(null);
    onClose();
  }

  const submit = handleSubmit(async (values) => {
    setSubmissionError(null);
    try {
      await onSave({ amount: values.amount || undefined });
      onSaved?.();
      close();
    } catch (error) {
      setSubmissionError(getFinanceErrorMessage(error));
    }
  });

  return (
    <FormModal
      open={Boolean(deposit)}
      title="Refund security deposit"
      description="Enter a partial refund amount, or leave it blank to refund the remaining paid amount. The backend validates the refund."
      onClose={close}
      onSubmit={(event) => void submit(event)}
      submitLabel="Record refund"
      submitVariant="danger"
      isSubmitting={isSaving || isSubmitting}
      error={submissionError}
    >
      <CurrencyField
        label="Refund amount"
        min="0.01"
        error={errors.amount?.message}
        {...register("amount")}
      />
    </FormModal>
  );
}
