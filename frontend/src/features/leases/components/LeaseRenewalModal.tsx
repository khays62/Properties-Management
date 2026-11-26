import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { DateField } from "../../../components/form";
import { FormModal } from "../../../components/overlays/FormModal";
import type { LeaseDetails, LeaseRenewalInput } from "../types/lease";
import { addDaysToDate } from "../utils/transitions";

function createRenewalSchema(minimumEndDate: string) {
  return z
    .object({
      new_end_date: z.string().refine((value) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const parsedDate = new Date(`${value}T00:00:00Z`);
        return (
          !Number.isNaN(parsedDate.getTime()) &&
          parsedDate.toISOString().slice(0, 10) === value
        );
      }, "Choose a valid lease end date."),
    })
    .refine((values) => values.new_end_date >= minimumEndDate, {
      path: ["new_end_date"],
      message: "End date must be after the successor lease start date.",
    });
}

type RenewalFormValues = z.infer<ReturnType<typeof createRenewalSchema>>;

export interface LeaseRenewalModalProps {
  open: boolean;
  lease: LeaseDetails;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (values: LeaseRenewalInput) => Promise<unknown>;
}

export function LeaseRenewalModal({
  isSubmitting = false,
  lease,
  onClose,
  onSubmit,
  open,
}: LeaseRenewalModalProps) {
  const minimumEndDate = addDaysToDate(lease.end_date, 2);
  const {
    formState: { errors, isSubmitting: formSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<RenewalFormValues>({
    resolver: zodResolver(createRenewalSchema(minimumEndDate)),
    defaultValues: { new_end_date: "" },
  });

  useEffect(() => {
    if (open) reset({ new_end_date: "" });
  }, [open, reset]);

  const submit = handleSubmit(async (values) => {
    await onSubmit(values);
  });

  return (
    <FormModal
      open={open}
      title="Renew lease"
      description={`The successor lease starts on ${addDaysToDate(
        lease.end_date,
        1,
      )}. Choose an end date after that start date.`}
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      submitLabel="Create successor lease"
      isSubmitting={isSubmitting || formSubmitting}
    >
      <DateField
        label="New lease end date"
        min={minimumEndDate}
        required
        error={errors.new_end_date?.message}
        {...register("new_end_date")}
      />
    </FormModal>
  );
}
