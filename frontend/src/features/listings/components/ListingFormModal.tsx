import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  CurrencyField,
  DateField,
  EntitySelector,
  NotesField,
  PropertySelector,
} from "../../../components/form";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { CreateEditModal } from "../../../components/overlays";
import { Input } from "../../../components/ui/Input";
import { toastService } from "../../../services/toastService";
import { getListingErrorMessage } from "../api/listings.api";
import {
  useAvailableListingUnits,
  useListingProperties,
} from "../hooks/useListings";
import {
  mogadishuDateTimeToUtc,
  formatDateTimeLocal,
} from "../utils/dates";
import type {
  Listing,
  ListingInput,
  ListingUpdateInput,
} from "../types/listing";

const amountSchema = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount with up to 2 decimal places.")
  .refine((value) => Number(value) > 0, "Enter an amount greater than zero.");

const depositSchema = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .regex(/^\d+(\.\d{1,2})?$/, "Enter an amount with up to 2 decimal places.")
  .refine((value) => Number(value) >= 0, "Deposit cannot be negative.");

const availableDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Select an availability date.")
  .refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return true;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid availability date.");

const listingFormSchema = z
  .object({
    mode: z.enum(["create", "edit"]),
    property: z.string().optional(),
    unit: z.string().optional(),
    title: z.string().trim().min(1, "Enter a listing title.").max(255),
    description: z.string().trim(),
    rent_amount: amountSchema,
    deposit_amount: depositSchema,
    available_date: availableDateSchema,
    expires_at: z.string(),
  })
  .superRefine((values, context) => {
    if (values.mode === "create") {
      if (!values.property) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["property"],
          message: "Select a property.",
        });
      }
      if (!values.unit) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["unit"],
          message: "Select an available unit.",
        });
      }
    }
    if (
      values.expires_at &&
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(values.expires_at)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["expires_at"],
        message: "Enter a valid expiration date and time.",
      });
    }
  });

type ListingFormInput = z.input<typeof listingFormSchema>;
type ListingFormOutput = z.output<typeof listingFormSchema>;

function getDefaultValues(
  mode: "create" | "edit",
  listing?: Listing | null,
): ListingFormInput {
  return {
    mode,
    property: "",
    unit: mode === "edit" ? listing?.unit : "",
    title: listing?.title ?? "",
    description: listing?.description ?? "",
    rent_amount: listing ? String(listing.rent_amount) : "",
    deposit_amount: listing ? String(listing.deposit_amount) : "",
    available_date: listing?.available_date ?? "",
    expires_at: formatDateTimeLocal(listing?.expires_at ?? null),
  };
}

export interface ListingFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  listing?: Listing | null;
  isSaving?: boolean;
  onClose: () => void;
  onCreate?: (values: ListingInput) => Promise<unknown>;
  onUpdate?: (values: ListingUpdateInput) => Promise<unknown>;
  onSaved?: () => void;
}

export function ListingFormModal({
  isSaving = false,
  listing,
  mode,
  onClose,
  onCreate,
  onSaved,
  onUpdate,
  open,
}: ListingFormModalProps) {
  const propertiesQuery = useListingProperties(open && mode === "create");
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<ListingFormInput, unknown, ListingFormOutput>({
    resolver: zodResolver(listingFormSchema),
    defaultValues: getDefaultValues(mode, listing),
  });
  const watchedProperty = useWatch({ control, name: "property" });
  const selectedProperty =
    mode === "create" ? watchedProperty ?? "" : "";
  const unitsQuery = useAvailableListingUnits(
    selectedProperty,
    open && mode === "create",
  );
  const properties = (propertiesQuery.data ?? []).filter(
    (property) => property.status !== "ARCHIVED",
  );
  const units = unitsQuery.data ?? [];

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues(mode, listing));
  }, [listing, mode, open, reset]);

  const submit = handleSubmit(async (values) => {
    try {
      const expiresAt = mogadishuDateTimeToUtc(values.expires_at);
      if (values.mode === "create") {
        if (!values.unit || !onCreate) {
          throw new Error("Select an available unit and try again.");
        }
        const createValues: ListingInput = {
          unit: values.unit,
          title: values.title,
          description: values.description,
          rent_amount: values.rent_amount,
          deposit_amount: values.deposit_amount,
          available_date: values.available_date,
          expires_at: expiresAt,
        };
        await onCreate(createValues);
      } else {
        if (!onUpdate) {
          throw new Error("Unable to update this listing.");
        }
        const updateValues: ListingUpdateInput = {
          title: values.title,
          description: values.description,
          rent_amount: values.rent_amount,
          deposit_amount: values.deposit_amount,
          available_date: values.available_date,
          expires_at: expiresAt,
        };
        await onUpdate(updateValues);
      }
      onSaved?.();
      onClose();
    } catch (error) {
      toastService.error(getListingErrorMessage(error));
    }
  }, () => {
    toastService.error("Please correct the highlighted fields.");
  });

  return (
    <CreateEditModal
      open={open}
      mode={mode}
      entityName="listing"
      description={
        mode === "create"
          ? "Create a draft listing for an available unit."
          : "Update the listing details. Its unit and workflow status cannot be edited here."
      }
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      isSubmitting={isSaving || isSubmitting}
    >
      {mode === "create" && (
        <div className="space-y-4">
          {propertiesQuery.isError ? (
            <ErrorState
              title="Unable to load properties"
              description={getListingErrorMessage(propertiesQuery.error)}
              onRetry={() => void propertiesQuery.refetch()}
            />
          ) : (
            <Controller
              name="property"
              control={control}
              render={({ field }) => (
                <PropertySelector
                  label="Property"
                  required
                  disabled={propertiesQuery.isLoading}
                  error={errors.property?.message}
                  options={properties.map((property) => ({
                    value: property.id,
                    label: `${property.name} (${property.code})`,
                  }))}
                  name={field.name}
                  value={field.value ?? ""}
                  onBlur={field.onBlur}
                  onChange={(event) => {
                    field.onChange(event);
                    setValue("unit", "");
                  }}
                />
              )}
            />
          )}
          {propertiesQuery.isLoading && (
            <LoadingState
              label="Loading properties"
              message="Loading available property options…"
              className="py-4"
            />
          )}
          {!propertiesQuery.isLoading &&
            !propertiesQuery.isError &&
            properties.length === 0 && (
              <EmptyState
                title="No properties available"
                description="Create or assign a property before creating a listing."
                className="py-4"
              />
            )}
          {selectedProperty && unitsQuery.isError && (
            <ErrorState
              title="Unable to load available units"
              description={getListingErrorMessage(unitsQuery.error)}
              onRetry={() => void unitsQuery.refetch()}
            />
          )}
          {selectedProperty && unitsQuery.isLoading && (
            <LoadingState
              label="Loading units"
              message="Loading available units for this property…"
              className="py-4"
            />
          )}
          {selectedProperty && !unitsQuery.isLoading && !unitsQuery.isError && (
            <>
              {units.length > 0 ? (
                <Controller
                  name="unit"
                  control={control}
                  render={({ field }) => (
                    <EntitySelector
                      label="Available unit"
                      required
                      disabled={unitsQuery.isLoading}
                      error={errors.unit?.message}
                      options={units.map((unit) => ({
                        value: unit.id,
                        label: `Unit ${unit.unit_number}`,
                      }))}
                      placeholder="Select an available unit"
                      name={field.name}
                      value={field.value ?? ""}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  )}
                />
              ) : (
                <EmptyState
                  title="No available units"
                  description="This property has no units that can currently be listed."
                  className="py-4"
                />
              )}
            </>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Listing title"
            required
            maxLength={255}
            error={errors.title?.message}
            {...register("title")}
          />
        </div>
        <CurrencyField
          label="Monthly rent"
          required
          min="0.01"
          error={errors.rent_amount?.message}
          {...register("rent_amount")}
        />
        <CurrencyField
          label="Deposit amount"
          required
          min="0"
          error={errors.deposit_amount?.message}
          {...register("deposit_amount")}
        />
        <DateField
          label="Available from"
          required
          error={errors.available_date?.message}
          {...register("available_date")}
        />
        <Input
          label="Expires at (Africa/Mogadishu)"
          type="datetime-local"
          error={errors.expires_at?.message}
          {...register("expires_at")}
        />
        <div className="sm:col-span-2">
          <NotesField
            label="Description"
            error={errors.description?.message}
            {...register("description")}
          />
        </div>
      </div>
    </CreateEditModal>
  );
}
