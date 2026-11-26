import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { EntitySelector } from "../../../components/form/EntitySelector";
import { NotesField, TenantSelector } from "../../../components/form";
import { CreateEditModal } from "../../../components/overlays/CreateEditModal";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { useAuth } from "../../../hooks/useAuth";
import { getMaintenanceErrorMessage } from "../api/maintenance.api";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  type MaintenanceCategory,
  type MaintenanceCreateInput,
  type MaintenancePriority,
} from "../types/maintenance";
import {
  useMaintenanceLeases,
  useMaintenanceUnits,
} from "../hooks/useMaintenance";

const schema = z.object({
  unit: z.string().uuid("Select a unit."),
  tenant: z.union([z.string().uuid(), z.literal("")]).optional(),
  title: z.string().trim().min(1, "Enter a ticket title.").max(255),
  description: z.string().trim().min(1, "Enter a ticket description."),
  category: z.enum(MAINTENANCE_CATEGORIES),
  priority: z.enum(MAINTENANCE_PRIORITIES),
});

type FormValues = z.infer<typeof schema>;

const CATEGORIES: { value: MaintenanceCategory; label: string }[] = [
  { value: "PLUMBING", label: "Plumbing" },
  { value: "ELECTRICAL", label: "Electrical" },
  { value: "CLEANING", label: "Cleaning" },
  { value: "SECURITY", label: "Security" },
  { value: "HVAC", label: "HVAC" },
  { value: "OTHER", label: "Other" },
];

const PRIORITIES: { value: MaintenancePriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export interface MaintenanceCreateModalProps {
  open: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: MaintenanceCreateInput) => Promise<unknown>;
  onSaved?: () => void;
}

export function MaintenanceCreateModal({
  isSaving = false,
  onClose,
  onSave,
  onSaved,
  open,
}: MaintenanceCreateModalProps) {
  const { user } = useAuth();
  const isTenant = user?.role === "TENANT";
  const formSchema = useMemo(
    () =>
      schema.superRefine((values, context) => {
        if (!isTenant && !values.tenant) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["tenant"],
            message: "Select a tenant with a lease for this unit.",
          });
        }
      }),
    [isTenant],
  );
  const unitsQuery = useMaintenanceUnits(open && !isTenant);
  const leasesQuery = useMaintenanceLeases(open);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      unit: "",
      tenant: "",
      title: "",
      description: "",
      category: "OTHER",
      priority: "MEDIUM",
    },
  });
  const selectedUnit = useWatch({ control, name: "unit" });
  const leases = useMemo(() => leasesQuery.data ?? [], [leasesQuery.data]);
  const selectableUnits = useMemo(() => {
    if (isTenant) {
      return [...new Map(
        leases
          .filter((lease) => lease.status === "ACTIVE")
          .map((lease) => [lease.unit, { id: lease.unit, unit_number: lease.unit }]),
      ).values()];
    }
    return unitsQuery.data ?? [];
  }, [isTenant, leases, unitsQuery.data]);
  const tenantOptions = useMemo(() => {
    const tenantIds = new Set(
      leases
        .filter((lease) => lease.unit === selectedUnit)
        .map((lease) => lease.tenant),
    );
    return [...tenantIds].map((id) => ({
      value: id,
      label: `Tenant ${id.slice(0, 8)}`,
    }));
  }, [leases, selectedUnit]);

  useEffect(() => {
    if (open) {
      reset({
        unit: "",
        tenant: "",
        title: "",
        description: "",
        category: "OTHER",
        priority: "MEDIUM",
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
      const payload: MaintenanceCreateInput = {
        unit: values.unit,
        title: values.title,
        description: values.description,
        category: values.category,
        priority: values.priority,
        ...(!isTenant && values.tenant ? { tenant: values.tenant } : {}),
      };
      await onSave(payload);
      onSaved?.();
      close();
    } catch (error) {
      setSubmissionError(getMaintenanceErrorMessage(error));
    }
  });

  const optionsError = isTenant ? leasesQuery.error : unitsQuery.error ?? leasesQuery.error;
  const optionsLoading =
    leasesQuery.isLoading || (!isTenant && unitsQuery.isLoading);

  return (
    <CreateEditModal
      open={open}
      mode="create"
      entityName="maintenance ticket"
      description={
        isTenant
          ? "Create a request for a unit on your active lease. The backend verifies occupancy and lease dates."
          : "Create a maintenance request for a tenant with a lease for the selected unit."
      }
      onClose={close}
      onSubmit={(event) => void submit(event)}
      isSubmitting={isSaving || isSubmitting}
    >
      {submissionError && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-sm text-danger">
          {submissionError}
        </p>
      )}
      {optionsLoading ? (
        <LoadingState
          label="Loading maintenance options"
          message="Loading units and active leases…"
        />
      ) : optionsError ? (
        <ErrorState
          title="Unable to load ticket options"
          description={getMaintenanceErrorMessage(optionsError)}
          onRetry={() => {
            if (leasesQuery.isError) void leasesQuery.refetch();
            if (!isTenant && unitsQuery.isError) void unitsQuery.refetch();
          }}
        />
      ) : selectableUnits.length === 0 ? (
        <EmptyState
          title={isTenant ? "No active lease units" : "No units available"}
          description={
            isTenant
              ? "Maintenance requests can only be created for a unit on your active lease."
              : "No units are available in your accessible properties."
          }
        />
      ) : (
        <div className="space-y-4">
          <EntitySelector
            label="Unit"
            required
            options={selectableUnits.map((unit) => ({
              value: unit.id,
              label: isTenant
                ? `Unit ${unit.unit_number.slice(0, 8)}`
                : `${unit.unit_number}${"status" in unit ? ` · ${unit.status}` : ""}`,
            }))}
            error={errors.unit?.message}
            {...register("unit", {
              onChange: () => {
                setValue("tenant", "");
              },
            })}
          />
          {!isTenant && (
            <TenantSelector
              label="Tenant"
              required
              options={tenantOptions}
              placeholder={
                selectedUnit
                  ? "Select a tenant with a lease for this unit"
                  : "Select a unit first"
              }
              disabled={!selectedUnit || tenantOptions.length === 0}
              error={errors.tenant?.message}
              {...register("tenant")}
            />
          )}
          <Input
            label="Ticket title"
            required
            maxLength={255}
            error={errors.title?.message}
            {...register("title")}
          />
          <NotesField
            label="Description"
            required
            error={errors.description?.message}
            {...register("description")}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Category"
              required
              error={errors.category?.message}
              {...register("category")}
            >
              {CATEGORIES.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </Select>
            <Select
              label="Priority"
              required
              error={errors.priority?.message}
              {...register("priority")}
            >
              {PRIORITIES.map((priority) => (
                <option key={priority.value} value={priority.value}>
                  {priority.label}
                </option>
              ))}
            </Select>
          </div>
          {isTenant && (
            <p className="text-sm text-text-secondary">
              The backend will associate this ticket with your tenant profile.
            </p>
          )}
        </div>
      )}
    </CreateEditModal>
  );
}
