import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { EntitySelector } from "../../../components/form/EntitySelector";
import { CreateEditModal } from "../../../components/overlays/CreateEditModal";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { getFinanceErrorMessage } from "../api/finance.api";
import {
  useAllRentSchedules,
  useFinanceLeaseOptions,
} from "../hooks/useFinance";
import {
  RENT_FREQUENCIES,
  type RentSchedule,
  type RentScheduleCreateInput,
  type RentScheduleUpdateInput,
} from "../types/finance";
import type { LeaseDetails } from "../../leases/types/lease";

const schema = z.object({
  lease: z.string().uuid("Select a lease."),
  due_day: z.number().int().min(1).max(31),
  frequency: z.enum(RENT_FREQUENCIES),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof schema>;
export type RentScheduleFormMode = "create" | "edit";

function isScheduleEligibleLease(lease: LeaseDetails): boolean {
  return lease.status === "ACTIVE" || lease.status === "EXPIRING";
}

export interface RentScheduleFormModalProps {
  open: boolean;
  schedule: RentSchedule | null;
  isSaving?: boolean;
  onClose: () => void;
  onCreate: (values: RentScheduleCreateInput) => Promise<unknown>;
  onUpdate: (
    id: string,
    values: RentScheduleUpdateInput,
  ) => Promise<unknown>;
  onSaved: (mode: RentScheduleFormMode) => void;
}

export function RentScheduleFormModal({
  isSaving = false,
  onClose,
  onCreate,
  onSaved,
  onUpdate,
  open,
  schedule,
}: RentScheduleFormModalProps) {
  const leasesQuery = useFinanceLeaseOptions(open && !schedule);
  const schedulesQuery = useAllRentSchedules(open && !schedule);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      lease: "",
      due_day: 1,
      frequency: "MONTHLY",
      is_active: true,
    },
  });

  const eligibleLeases = useMemo(
    () => {
      const scheduledLeaseIds = new Set(
        (schedulesQuery.data ?? []).map((item) => item.lease),
      );
      return (leasesQuery.data ?? []).filter(
        (lease) =>
          isScheduleEligibleLease(lease) && !scheduledLeaseIds.has(lease.id),
      );
    },
    [leasesQuery.data, schedulesQuery.data],
  );
  const selectedLeaseId = useWatch({ control, name: "lease" });
  const selectedLease = eligibleLeases.find(
    (lease) => lease.id === selectedLeaseId,
  );

  useEffect(() => {
    if (!open) return;
    reset(
      schedule
        ? {
            lease: schedule.lease,
            due_day: schedule.due_day,
            frequency: schedule.frequency,
            is_active: schedule.is_active,
          }
        : {
            lease: "",
            due_day: 1,
            frequency: "MONTHLY",
            is_active: true,
          },
    );
  }, [open, reset, schedule]);

  const isLoadingLeases =
    open &&
    !schedule &&
    (leasesQuery.isLoading || schedulesQuery.isLoading);
  const queryError =
    !schedule && leasesQuery.isError
      ? leasesQuery.error
      : !schedule && schedulesQuery.isError
        ? schedulesQuery.error
        : null;

  function close() {
    setSubmissionError(null);
    onClose();
  }

  const submit = handleSubmit(async (values) => {
    setSubmissionError(null);
    try {
      if (schedule) {
        await onUpdate(schedule.id, {
          due_day: values.due_day,
          frequency: values.frequency,
          is_active: values.is_active,
        });
        onSaved("edit");
      } else {
        await onCreate({
          lease: values.lease,
          due_day: values.due_day,
          frequency: values.frequency,
          is_active: values.is_active,
        });
        onSaved("create");
      }
      close();
    } catch (error) {
      setSubmissionError(getFinanceErrorMessage(error));
    }
  });

  const leaseRegistration = register("lease");

  return (
    <CreateEditModal
      open={open}
      mode={schedule ? "edit" : "create"}
      entityName="rent schedule"
      description="Schedules are monthly and use the due day configured on the lease."
      onClose={close}
      onSubmit={(event) => void submit(event)}
      isSubmitting={isSaving || isSubmitting || isLoadingLeases}
      error={submissionError}
    >
      {isLoadingLeases ? (
        <LoadingState
          label="Loading eligible leases"
          message="Loading leases and existing rent schedules…"
        />
      ) : queryError ? (
        <ErrorState
          title="Unable to load rent schedule options"
          description={getFinanceErrorMessage(queryError)}
          onRetry={() => {
            void leasesQuery.refetch();
            void schedulesQuery.refetch();
          }}
        />
      ) : !schedule && eligibleLeases.length === 0 ? (
        <EmptyState
          title="No eligible leases"
          description="A schedule can be created only for an active or expiring lease that does not already have a schedule."
        />
      ) : (
        <>
          {schedule ? (
            <>
              <Input
                label="Lease"
                value={`Lease ${schedule.lease}`}
                readOnly
              />
              <input type="hidden" {...register("lease")} />
              <Input
                label="Due day"
                type="number"
                readOnly
                helperText="The due day must match the lease."
                {...register("due_day", { valueAsNumber: true })}
              />
              <Input label="Frequency" value="Monthly" readOnly />
              <input type="hidden" {...register("frequency")} />
            </>
          ) : (
            <>
              <EntitySelector
                label="Lease"
                required
                options={eligibleLeases.map((lease) => ({
                  value: lease.id,
                  label: `Lease ${lease.id.slice(0, 8)} · ${lease.status}`,
                }))}
                error={errors.lease?.message}
                {...leaseRegistration}
                onChange={(event) => {
                  leaseRegistration.onChange(event);
                  const lease = eligibleLeases.find(
                    (item) => item.id === event.target.value,
                  );
                  setValue("due_day", lease?.payment_due_day ?? 1, {
                    shouldValidate: true,
                  });
                }}
              />
              <Input
                label="Due day"
                type="number"
                min={1}
                max={31}
                readOnly
                helperText={
                  selectedLease
                    ? "This is set by the selected lease."
                    : "Select a lease to view its payment due day."
                }
                error={errors.due_day?.message}
                {...register("due_day", { valueAsNumber: true })}
              />
              <Select
                label="Frequency"
                required
                error={errors.frequency?.message}
                {...register("frequency")}
              >
                <option value="MONTHLY">Monthly</option>
              </Select>
            </>
          )}
          <Controller
            name="is_active"
            control={control}
            render={({ field }) => (
              <Select
                label="Schedule state"
                value={String(field.value)}
                onChange={(event) =>
                  field.onChange(event.target.value === "true")
                }
              >
                <option value="true">Active</option>
                <option value="false">Disabled</option>
              </Select>
            )}
          />
        </>
      )}
    </CreateEditModal>
  );
}
