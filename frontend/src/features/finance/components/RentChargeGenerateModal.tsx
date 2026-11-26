import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormModal } from "../../../components/overlays/FormModal";
import { Input } from "../../../components/ui/Input";
import { getFinanceErrorMessage } from "../api/finance.api";
import type { RentChargeGenerateInput } from "../types/finance";
import { getBusinessDate } from "../utils/actions";

const schema = z.object({
  billing_month: z.number().int().min(1).max(12),
  billing_year: z.number().int().min(1).max(9999),
});

type FormValues = z.infer<typeof schema>;

export interface RentChargeGenerateModalProps {
  open: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: RentChargeGenerateInput) => Promise<unknown>;
  onSaved?: () => void;
}

function currentPeriod(): FormValues {
  const [year, month] = getBusinessDate().split("-").map(Number);
  return { billing_month: month, billing_year: year };
}

export function RentChargeGenerateModal({
  isSaving = false,
  onClose,
  onSave,
  onSaved,
  open,
}: RentChargeGenerateModalProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: currentPeriod(),
  });

  useEffect(() => {
    if (open) reset(currentPeriod());
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
      title="Generate monthly rent charges"
      description="The backend creates charges for eligible active schedules and returns existing charges when the billing period was already generated."
      onClose={close}
      onSubmit={(event) => void submit(event)}
      submitLabel="Generate charges"
      isSubmitting={isSaving || isSubmitting}
      error={submissionError}
    >
      <Input
        label="Billing month"
        type="number"
        min={1}
        max={12}
        step={1}
        required
        error={errors.billing_month?.message}
        {...register("billing_month", { valueAsNumber: true })}
      />
      <Input
        label="Billing year"
        type="number"
        min={1}
        max={9999}
        step={1}
        required
        error={errors.billing_year?.message}
        {...register("billing_year", { valueAsNumber: true })}
      />
    </FormModal>
  );
}
