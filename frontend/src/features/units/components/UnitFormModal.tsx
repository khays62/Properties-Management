import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import {
  CurrencyField,
  NotesField,
  PropertySelector,
} from "../../../components/form";
import { CreateEditModal } from "../../../components/overlays";
import { Select } from "../../../components/ui/Select";
import { Input } from "../../../components/ui/Input";
import { toastService } from "../../../services/toastService";
import { getUnitErrorMessage } from "../api/units.api";
import {
  UNIT_STATUSES,
  type Unit,
  type UnitInput,
} from "../types/unit";
import type { Property } from "../../properties/types/property";

const integerSchema = z
  .string()
  .trim()
  .min(1, "Enter a whole number.")
  .regex(/^-?\d+$/, "Enter a whole number.")
  .transform(Number);

const nonNegativeIntegerSchema = integerSchema.refine(
  (value) => value >= 0,
  "Enter zero or more.",
);

const decimalSchema = z
  .string()
  .trim()
  .min(1, "Enter a number.")
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount with up to 2 decimals.")
  .transform(Number);

const nonNegativeDecimalSchema = decimalSchema.refine(
  (value) => value >= 0,
  "Enter zero or more.",
);

const positiveDecimalSchema = decimalSchema.refine(
  (value) => value > 0,
  "Enter an amount greater than zero.",
);

const unitFormSchema = z.object({
  property: z.string().uuid("Select a property."),
  unit_number: z.string().trim().min(1, "Enter a unit number.").max(50),
  floor: integerSchema,
  bedrooms: nonNegativeIntegerSchema,
  bathrooms: nonNegativeDecimalSchema,
  square_meters: positiveDecimalSchema,
  rent_amount: positiveDecimalSchema,
  deposit_amount: nonNegativeDecimalSchema,
  description: z.string().trim(),
  status: z.enum(UNIT_STATUSES),
});

type UnitFormValues = z.input<typeof unitFormSchema>;
type ParsedUnitFormValues = z.output<typeof unitFormSchema>;

const EMPTY_UNIT: UnitFormValues = {
  property: "",
  unit_number: "",
  floor: "0",
  bedrooms: "0",
  bathrooms: "0",
  square_meters: "",
  rent_amount: "",
  deposit_amount: "0",
  description: "",
  status: "AVAILABLE",
};

function toFormValues(
  unit: Unit | null | undefined,
  initialPropertyId: string,
): UnitFormValues {
  if (!unit) {
    return { ...EMPTY_UNIT, property: initialPropertyId };
  }
  return {
    property: unit.property,
    unit_number: unit.unit_number,
    floor: String(unit.floor),
    bedrooms: String(unit.bedrooms),
    bathrooms: String(unit.bathrooms),
    square_meters: String(unit.square_meters),
    rent_amount: String(unit.rent_amount),
    deposit_amount: String(unit.deposit_amount),
    description: unit.description,
    status: unit.status,
  };
}

export interface UnitFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  properties: readonly Property[];
  unit?: Unit | null;
  initialPropertyId?: string;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: UnitInput) => Promise<unknown>;
  onSaved?: () => void;
}

export function UnitFormModal({
  initialPropertyId = "",
  isSaving = false,
  mode,
  onClose,
  onSave,
  onSaved,
  open,
  properties,
  unit,
}: UnitFormModalProps) {
  const {
    formState: { errors, isSubmitting },
    control,
    handleSubmit,
    register,
    reset,
  } = useForm<UnitFormValues, unknown, ParsedUnitFormValues>({
    resolver: zodResolver(unitFormSchema),
    defaultValues: toFormValues(unit, initialPropertyId),
  });

  useEffect(() => {
    if (!open) return;
    reset(toFormValues(unit, initialPropertyId));
  }, [initialPropertyId, open, reset, unit]);

  const submit = handleSubmit(async (values) => {
    try {
      await onSave(values);
      onSaved?.();
      onClose();
    } catch (error) {
      toastService.error(getUnitErrorMessage(error));
    }
  }, () => {
    toastService.error("Please correct the highlighted fields.");
  });

  return (
    <CreateEditModal
      open={open}
      mode={mode}
      entityName="unit"
      description={
        mode === "create"
          ? "Add the unit details and assign it to a property."
          : "Update the unit details and property assignment."
      }
      onClose={onClose}
      onSubmit={(event) => void submit(event)}
      isSubmitting={isSaving || isSubmitting}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Controller
          name="property"
          control={control}
          render={({ field }) => (
            <PropertySelector
              label="Property"
              required
              error={errors.property?.message}
              options={properties.map((property) => ({
                value: property.id,
                label: `${property.name} (${property.code})`,
              }))}
              name={field.name}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            />
          )}
        />
        <Input
          label="Unit number"
          required
          error={errors.unit_number?.message}
          {...register("unit_number")}
        />
        <Input
          label="Floor"
          type="number"
          step="1"
          required
          error={errors.floor?.message}
          {...register("floor")}
        />
        <Input
          label="Bedrooms"
          type="number"
          min="0"
          step="1"
          required
          error={errors.bedrooms?.message}
          {...register("bedrooms")}
        />
        <Input
          label="Bathrooms"
          type="number"
          min="0"
          step="0.01"
          required
          error={errors.bathrooms?.message}
          {...register("bathrooms")}
        />
        <Input
          label="Area (m²)"
          type="number"
          min="0.01"
          step="0.01"
          required
          error={errors.square_meters?.message}
          {...register("square_meters")}
        />
        <CurrencyField
          label="Monthly rent"
          min="0.01"
          required
          error={errors.rent_amount?.message}
          {...register("rent_amount")}
        />
        <CurrencyField
          label="Deposit amount"
          min="0"
          required
          error={errors.deposit_amount?.message}
          {...register("deposit_amount")}
        />
        <Select
          label="Availability status"
          required
          error={errors.status?.message}
          {...register("status")}
        >
          {UNIT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </option>
          ))}
        </Select>
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
