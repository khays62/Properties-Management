import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  CurrencyField,
  DateField,
  EntitySelector,
  NotesField,
} from "../../../components/form";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Alert } from "../../../components/feedback/Alert";
import { CreateEditModal } from "../../../components/overlays/CreateEditModal";
import { Input } from "../../../components/ui/Input";
import { useListing } from "../../listings/hooks/useListings";
import { useUnit } from "../../units/hooks/useUnits";
import { getLeaseErrorMessage } from "../api/leases.api";
import { useLeaseApplicationOptions } from "../hooks/useLeases";
import type { LeaseCreateInput } from "../types/lease";

const dateValueSchema = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsedDate = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
}, "Enter a valid date.");

const positiveAmountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter a valid amount.")
  .refine((value) => Number(value) > 0, "Monthly rent must be greater than zero.");

const nonnegativeAmountSchema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(?:\.\d{1,2})?$/, "Enter a valid amount.")
  .refine((value) => Number(value) >= 0, "Deposit cannot be negative.");

const leaseCreateSchema = z
  .object({
    application: z.string().uuid("Select an approved application."),
    start_date: dateValueSchema,
    end_date: dateValueSchema,
    monthly_rent: positiveAmountSchema,
    deposit_amount: nonnegativeAmountSchema,
    payment_due_day: z
      .number()
      .int("Enter a whole number.")
      .min(1, "Due day must be between 1 and 31.")
      .max(31, "Due day must be between 1 and 31."),
    notes: z.string(),
  })
  .refine((values) => values.start_date < values.end_date, {
    path: ["end_date"],
    message: "End date must be after start date.",
  });

type LeaseCreateFormValues = z.infer<typeof leaseCreateSchema>;

const EMPTY_VALUES: LeaseCreateFormValues = {
  application: "",
  start_date: "",
  end_date: "",
  monthly_rent: "",
  deposit_amount: "",
  payment_due_day: 1,
  notes: "",
};

export interface LeaseCreateModalProps {
  open: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: LeaseCreateInput) => Promise<unknown>;
  onSaved?: () => void;
}

export function LeaseCreateModal({
  isSaving = false,
  onClose,
  onSave,
  onSaved,
  open,
}: LeaseCreateModalProps) {
  const applicationsQuery = useLeaseApplicationOptions(open);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<LeaseCreateFormValues>({
    resolver: zodResolver(leaseCreateSchema),
    defaultValues: EMPTY_VALUES,
  });
  const selectedApplicationId = useWatch({
    control,
    name: "application",
  });
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const selectedApplication = applicationsQuery.data?.find(
    (application) => application.id === selectedApplicationId,
  );
  const listingQuery = useListing(selectedApplication?.listing ?? "");
  const listing = listingQuery.data;
  const unitQuery = useUnit(listing?.unit ?? "");
  const unit = unitQuery.data;

  useEffect(() => {
    if (open) reset(EMPTY_VALUES);
  }, [open, reset]);

  useEffect(() => {
    if (!listing) return;
    setValue("monthly_rent", String(listing.rent_amount), {
      shouldValidate: true,
    });
    setValue("deposit_amount", String(listing.deposit_amount), {
      shouldValidate: true,
    });
  }, [listing, setValue]);

  const canCreateForListing =
    !selectedApplication ||
    (listing?.status === "PUBLISHED" && unit?.status === "LISTED");

  const submit = handleSubmit(
    async (values) => {
      setSubmissionError(null);
      try {
        await onSave(values);
        onSaved?.();
        onClose();
      } catch (error) {
        setSubmissionError(getLeaseErrorMessage(error));
      }
    },
    () => {
      // Validation details are shown beside the corresponding controls.
    },
  );

  const applications = applicationsQuery.data ?? [];
  const noEligibleListing =
    listing &&
    unit &&
    (listing.status !== "PUBLISHED" || unit.status !== "LISTED");

  return (
    <CreateEditModal
      open={open}
      mode="create"
      entityName="lease"
      description="Create a draft lease from an approved, screened application."
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      isSubmitting={
        isSaving || isSubmitting || Boolean(selectedApplication && !canCreateForListing)
      }
    >
      {applicationsQuery.isLoading ? (
        <LoadingState
          label="Loading approved applications"
          message="Loading approved applications…"
        />
      ) : applicationsQuery.isError ? (
        <ErrorState
          title="Unable to load approved applications"
          description={getLeaseErrorMessage(applicationsQuery.error)}
          onRetry={() => void applicationsQuery.refetch()}
        />
      ) : applications.length === 0 ? (
        <EmptyState
          title="No approved applications"
          description="An approved application with a passed screening is required before a lease can be created."
        />
      ) : (
        <div className="space-y-5">
          {submissionError && (
            <Alert variant="danger" role="alert">
              {submissionError}
            </Alert>
          )}
          <EntitySelector
            label="Approved application"
            required
            placeholder="Select an approved application"
            options={applications.map((application) => ({
              value: application.id,
              label: `${application.applicant.first_name} ${application.applicant.last_name} · ${application.applicant.email} · ${application.move_in_date}`,
            }))}
            error={errors.application?.message}
            {...register("application")}
          />

          {selectedApplication && (
            <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-background p-4">
              <p className="text-sm font-medium text-text-primary">
                Selected listing
              </p>
              {listingQuery.isLoading || unitQuery.isLoading ? (
                <LoadingState
                  label="Loading listing availability"
                  message="Checking the application listing and unit…"
                  className="py-4"
                />
              ) : listingQuery.isError || unitQuery.isError ? (
                <ErrorState
                  title="Unable to verify listing availability"
                  description={getLeaseErrorMessage(
                    listingQuery.error ?? unitQuery.error,
                  )}
                  onRetry={() => {
                    void listingQuery.refetch();
                    void unitQuery.refetch();
                  }}
                />
              ) : listing && unit ? (
                <>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-text-secondary">Listing</dt>
                      <dd className="mt-1 font-medium">{listing.title}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Unit status</dt>
                      <dd className="mt-1 font-medium">{unit.status}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Listing status</dt>
                      <dd className="mt-1 font-medium">{listing.status}</dd>
                    </div>
                    <div>
                      <dt className="text-text-secondary">Listing rent</dt>
                      <dd className="mt-1 font-medium">
                        {listing.rent_amount}
                      </dd>
                    </div>
                  </dl>
                  {noEligibleListing && (
                    <Alert variant="warning">
                      A lease can only be created while its listing is
                      published and its unit is listed.
                    </Alert>
                  )}
                </>
              ) : (
                <Alert variant="danger">
                  The approved application’s listing or unit could not be
                  found.
                </Alert>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <DateField
              label="Lease start date"
              required
              error={errors.start_date?.message}
              {...register("start_date")}
            />
            <DateField
              label="Lease end date"
              required
              error={errors.end_date?.message}
              {...register("end_date")}
            />
            <CurrencyField
              label="Monthly rent"
              required
              min="0.01"
              error={errors.monthly_rent?.message}
              {...register("monthly_rent")}
            />
            <CurrencyField
              label="Security deposit"
              required
              min="0"
              error={errors.deposit_amount?.message}
              {...register("deposit_amount")}
            />
            <div className="space-y-2">
              <Input
                label="Payment due day"
                required
                type="number"
                min="1"
                max="31"
                step="1"
                error={errors.payment_due_day?.message}
                {...register("payment_due_day", { valueAsNumber: true })}
              />
            </div>
            <div className="sm:col-span-2">
              <NotesField
                label="Lease notes"
                error={errors.notes?.message}
                {...register("notes")}
              />
            </div>
          </div>
        </div>
      )}
    </CreateEditModal>
  );
}
