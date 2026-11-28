import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { CurrencyField, DateField, NotesField, TenantSelector } from "../../../components/form";
import { EntitySelector } from "../../../components/form/EntitySelector";
import { FormModal } from "../../../components/overlays/FormModal";
import { Input } from "../../../components/ui/Input";
import { getFinanceErrorMessage } from "../api/finance.api";
import { useFinanceLeaseOptions } from "../hooks/useFinance";
import { PAYMENT_METHODS, type PaymentCreateInput, type PaymentMethod } from "../types/finance";
import { getBusinessDate } from "../utils/actions";

const schema = z.object({
  tenant: z.string().uuid("Select or enter a valid tenant."),
  amount: z
    .string()
    .trim()
    .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter a valid amount.")
    .refine((value) => Number(value) > 0, "Amount must be greater than zero."),
  payment_date: z.string().min(1, "Payment date is required."),
  reference_number: z
    .string()
    .trim()
    .min(1, "Reference number is required.")
    .max(100),
  payment_method: z.enum(PAYMENT_METHODS),
  notes: z.string(),
});

type FormValues = z.infer<typeof schema>;

const METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "MOBILE_MONEY", label: "Mobile money" },
  { value: "CARD", label: "Card" },
] satisfies { value: PaymentMethod; label: string }[];

export interface PaymentCreateModalProps {
  open: boolean;
  canSelectTenant: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: PaymentCreateInput) => Promise<unknown>;
  onSaved?: () => void;
}

export function PaymentCreateModal({
  canSelectTenant,
  isSaving = false,
  onClose,
  onSave,
  onSaved,
  open,
}: PaymentCreateModalProps) {
  const leasesQuery = useFinanceLeaseOptions(open && canSelectTenant);
  const tenants = useMemo(() => {
    const tenantIds = new Set(
      (leasesQuery.data ?? []).map((lease) => lease.tenant),
    );
    return [...tenantIds].map((id) => {
      const lease = leasesQuery.data?.find((item) => item.tenant === id);
      return {
        value: id,
        label: lease?.tenant_name || lease?.tenant_email || "Tenant",
      };
    });
  }, [leasesQuery.data]);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      tenant: "",
      amount: "",
      payment_date: getBusinessDate(),
      reference_number: "",
      payment_method: "MOBILE_MONEY",
      notes: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        tenant: "",
        amount: "",
        payment_date: getBusinessDate(),
        reference_number: "",
        payment_method: "MOBILE_MONEY",
        notes: "",
      });
    }
  }, [open, reset]);

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

  return (
    <FormModal
      open={open}
      title="Record payment"
      description="Payments are created as pending. The backend validates and completes them only when their allocations are recorded."
      onClose={close}
      onSubmit={(event) => void submit(event)}
      submitLabel="Record payment"
      isSubmitting={isSaving || isSubmitting}
      error={submissionError}
    >
      {canSelectTenant ? (
        leasesQuery.isLoading ? (
          <LoadingState
            label="Loading tenants"
            message="Loading tenants with accessible lease records…"
          />
        ) : leasesQuery.isError ? (
          <ErrorState
            title="Unable to load tenants"
            description={getFinanceErrorMessage(leasesQuery.error)}
            onRetry={() => void leasesQuery.refetch()}
          />
        ) : tenants.length === 0 ? (
          <EmptyState
            title="No tenant records available"
            description="A tenant with an accessible lease is required to record a payment."
          />
        ) : (
          <EntitySelector
            label="Tenant"
            required
            options={tenants}
            error={errors.tenant?.message}
            {...register("tenant")}
          />
        )
      ) : (
        <Input
          label="Tenant"
          required
          placeholder="Enter the tenant reference"
          error={errors.tenant?.message}
          {...register("tenant")}
        />
      )}
      <CurrencyField
        label="Payment amount"
        min="0.01"
        required
        error={errors.amount?.message}
        {...register("amount")}
      />
      <DateField
        label="Payment date"
        required
        error={errors.payment_date?.message}
        {...register("payment_date")}
      />
      <Input
        label="Payment reference"
        maxLength={100}
        required
        error={errors.reference_number?.message}
        {...register("reference_number")}
      />
      <TenantSelector
        label="Payment method"
        required
        options={METHODS}
        error={errors.payment_method?.message}
        {...register("payment_method")}
      />
      <NotesField
        label="Notes"
        error={errors.notes?.message}
        {...register("notes")}
      />
    </FormModal>
  );
}
