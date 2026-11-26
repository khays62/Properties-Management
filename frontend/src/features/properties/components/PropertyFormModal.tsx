import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AddressField, NotesField } from "../../../components/form";
import { CreateEditModal } from "../../../components/overlays";
import { Input } from "../../../components/ui/Input";
import { getPropertyErrorMessage } from "../api/properties.api";
import { toastService } from "../../../services/toastService";
import type { Property, PropertyInput } from "../types/property";

const propertyFormSchema = z.object({
  name: z.string().trim().min(1, "Enter a property name.").max(255),
  code: z.string().trim().min(1, "Enter a property code.").max(50),
  address: z.string().trim().min(1, "Enter a street address.").max(255),
  city: z.string().trim().min(1, "Enter a city.").max(100),
  country: z.string().trim().min(1, "Enter a country.").max(100),
  description: z.string().trim(),
});

export type PropertyFormValues = z.infer<typeof propertyFormSchema>;

const EMPTY_PROPERTY: PropertyFormValues = {
  name: "",
  code: "",
  address: "",
  city: "",
  country: "",
  description: "",
};

function toFormValues(property?: Property | null): PropertyFormValues {
  if (!property) return EMPTY_PROPERTY;
  return {
    name: property.name,
    code: property.code,
    address: property.address,
    city: property.city,
    country: property.country,
    description: property.description,
  };
}

export interface PropertyFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  property?: Property | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: PropertyInput) => Promise<unknown>;
  onSaved?: () => void;
}

export function PropertyFormModal({
  isSaving = false,
  mode,
  onClose,
  onSave,
  onSaved,
  open,
  property,
}: PropertyFormModalProps) {
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: toFormValues(property),
  });

  useEffect(() => {
    if (!open) return;
    reset(toFormValues(property));
  }, [open, property, reset]);

  function closeModal() {
    onClose();
  }

  const submit = handleSubmit(async (values) => {
    try {
      await onSave(values);
      onSaved?.();
      closeModal();
    } catch (error) {
      toastService.error(getPropertyErrorMessage(error));
    }
  }, () => {
    toastService.error("Please correct the highlighted fields.");
  });

  return (
    <CreateEditModal
      open={open}
      mode={mode}
      entityName="property"
      description={
        mode === "create"
          ? "Add the primary details for this property."
          : "Update the property details."
      }
      onClose={closeModal}
      onSubmit={(event) => void submit(event)}
      isSubmitting={isSaving || isSubmitting}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Property name"
            autoComplete="organization"
            required
            error={errors.name?.message}
            {...register("name")}
          />
        </div>
        <Input
          label="Property code"
          required
          error={errors.code?.message}
          {...register("code")}
        />
        <AddressField
          label="Street address"
          required
          error={errors.address?.message}
          {...register("address")}
        />
        <Input
          label="City"
          autoComplete="address-level2"
          required
          error={errors.city?.message}
          {...register("city")}
        />
        <Input
          label="Country"
          autoComplete="country-name"
          required
          error={errors.country?.message}
          {...register("country")}
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
