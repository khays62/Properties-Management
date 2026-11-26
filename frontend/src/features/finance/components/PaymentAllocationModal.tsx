import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "../../../components/ui/Button";
import { CurrencyField } from "../../../components/form";
import { EntitySelector } from "../../../components/form/EntitySelector";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { FormModal } from "../../../components/overlays/FormModal";
import type { PaymentDetails, AllocatePaymentInput } from "../types/finance";
import { getFinanceErrorMessage } from "../api/finance.api";
import { useAllRentCharges } from "../hooks/useFinance";

const allocationSchema = z.object({
  rent_charge: z.string().uuid("Select a rent charge."),
  amount_allocated: z
    .string()
    .trim()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter a valid amount.")
    .refine((value) => Number(value) > 0, "Amount must be greater than zero."),
});

const schema = z.object({
  allocations: z.array(allocationSchema).min(1, "Add at least one allocation."),
});

type FormValues = z.infer<typeof schema>;

export interface PaymentAllocationModalProps {
  payment: PaymentDetails | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: AllocatePaymentInput) => Promise<unknown>;
  onSaved?: () => void;
}

export function PaymentAllocationModal({
  isSaving = false,
  onClose,
  onSave,
  onSaved,
  payment,
}: PaymentAllocationModalProps) {
  const chargesQuery = useAllRentCharges(
    { tenant: payment?.tenant },
    Boolean(payment),
  );
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      allocations: [{ rent_charge: "", amount_allocated: "" }],
    },
  });
  const { append, fields, remove } = useFieldArray({
    control,
    name: "allocations",
  });

  useEffect(() => {
    if (payment) {
      reset({
        allocations: [{ rent_charge: "", amount_allocated: "" }],
      });
    }
  }, [payment, reset]);

  function close() {
    setSubmissionError(null);
    onClose();
  }

  const submit = handleSubmit(async (values) => {
    setSubmissionError(null);
    try {
      await onSave(values);
      onSaved?.();
      close();
    } catch (error) {
      setSubmissionError(getFinanceErrorMessage(error));
    }
  });

  const charges = (chargesQuery.data ?? []).filter(
    (charge) => charge.status !== "PAID" && charge.status !== "CANCELLED",
  );
  return (
    <FormModal
      open={Boolean(payment)}
      title="Allocate payment"
      description={
        payment
          ? `Payment amount: ${payment.amount}. Allocation amounts must equal this amount. The backend validates tenant ownership and charge balances.`
          : undefined
      }
      onClose={close}
      onSubmit={(event) => void submit(event)}
      submitLabel="Allocate payment"
      isSubmitting={isSaving || isSubmitting}
      error={submissionError}
    >
      {chargesQuery.isLoading ? (
        <LoadingState
          label="Loading rent charges"
          message="Loading charges for this tenant…"
        />
      ) : chargesQuery.isError ? (
        <ErrorState
          title="Unable to load rent charges"
          description={getFinanceErrorMessage(chargesQuery.error)}
          onRetry={() => void chargesQuery.refetch()}
        />
      ) : (
        <div className="space-y-4">
          {charges.length === 0 ? (
            <EmptyState
              title="No allocatable rent charges"
              description="This tenant has no rent charges available for allocation."
            />
          ) : (
            fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border border-[var(--color-border)] p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
            >
              <EntitySelector
                label={`Rent charge ${index + 1}`}
                required
                options={charges.map((charge) => ({
                  value: charge.id,
                  label: `${charge.billing_month}/${charge.billing_year} · ${charge.status} · balance ${charge.balance}`,
                }))}
                error={errors.allocations?.[index]?.rent_charge?.message}
                {...register(`allocations.${index}.rent_charge`)}
              />
              <CurrencyField
                label="Allocation amount"
                min="0.01"
                required
                error={errors.allocations?.[index]?.amount_allocated?.message}
                {...register(`allocations.${index}.amount_allocated`)}
              />
              {fields.length > 1 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="self-end"
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
              )}
            </div>
            ))
          )}
          {charges.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                append({ rent_charge: "", amount_allocated: "" })
              }
            >
              Add another charge
            </Button>
          )}
        </div>
      )}
    </FormModal>
  );
}
