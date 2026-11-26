import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { CurrencyField, DateField } from "../../../components/form";
import { EntitySelector } from "../../../components/form/EntitySelector";
import { FormModal } from "../../../components/overlays/FormModal";
import { Input } from "../../../components/ui/Input";
import { getFinanceErrorMessage } from "../api/finance.api";
import { PAYMENT_METHODS, type Deposit, type DepositPaymentInput, type PaymentMethod } from "../types/finance";

const amountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter a valid amount.")
  .refine((value) => Number(value) > 0, "Amount must be greater than zero.");
const schema = z.object({
  amount: amountSchema,
  reference_number: z.string().trim().min(1, "Reference number is required.").max(100),
  payment_date: z.string().optional(),
  payment_method: z.enum(PAYMENT_METHODS),
});

type FormValues = z.infer<typeof schema>;

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "CARD", label: "Card" },
] satisfies { value: PaymentMethod; label: string }[];

export interface DepositPaymentModalProps {
  deposit: Deposit | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: DepositPaymentInput) => Promise<unknown>;
  onSaved?: () => void;
}

export function DepositPaymentModal({
  deposit,
  isSaving = false,
  onClose,
  onSave,
  onSaved,
}: DepositPaymentModalProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: "",
      reference_number: "",
      payment_date: "",
      payment_method: "MOBILE_MONEY",
    },
  });

  useEffect(() => {
    if (deposit) {
      reset({
        amount: "",
        reference_number: "",
        payment_date: "",
        payment_method: "MOBILE_MONEY",
      });
    }
  }, [deposit, reset]);

  function close() {
    setSubmissionError(null);
    onClose();
  }

  const submit = handleSubmit(async (values) => {
    if (!deposit) return;
    setSubmissionError(null);
    try {
      await onSave({
        ...values,
        payment_date: values.payment_date || undefined,
      });
      onSaved?.();
      close();
    } catch (error) {
      setSubmissionError(getFinanceErrorMessage(error));
    }
  });

  return (
    <FormModal
      open={Boolean(deposit)}
      title="Record deposit payment"
      description={
        deposit
          ? `Record a payment against the deposit for lease ${deposit.lease.slice(0, 8)}. The backend validates the remaining amount.`
          : undefined
      }
      onClose={close}
      onSubmit={(event) => void submit(event)}
      submitLabel="Record payment"
      isSubmitting={isSaving || isSubmitting}
      error={submissionError}
    >
      <CurrencyField
        label="Payment amount"
        min="0.01"
        required
        error={errors.amount?.message}
        {...register("amount")}
      />
      <Input
        label="Payment reference"
        maxLength={100}
        required
        error={errors.reference_number?.message}
        {...register("reference_number")}
      />
      <DateField
        label="Payment date"
        error={errors.payment_date?.message}
        {...register("payment_date")}
      />
      <EntitySelector
        label="Payment method"
        required
        options={METHODS}
        error={errors.payment_method?.message}
        {...register("payment_method")}
      />
    </FormModal>
  );
}
