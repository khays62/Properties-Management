import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { EntitySelector } from "../../../components/form/EntitySelector";
import { CreateEditModal } from "../../../components/overlays/CreateEditModal";
import { Input } from "../../../components/ui/Input";
import { getFinanceErrorMessage } from "../api/finance.api";
import { useFinanceLeaseOptions } from "../hooks/useFinance";
import type { LeaseDetails } from "../../leases/types/lease";
import type { DepositCreateInput } from "../types/finance";

const schema = z.object({
  lease: z.string().uuid("Select or enter a valid lease."),
});

type FormValues = z.infer<typeof schema>;

export interface DepositCreateModalProps {
  open: boolean;
  canSelectLease: boolean;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: DepositCreateInput) => Promise<unknown>;
  onSaved?: () => void;
}

function isDepositEligibleLease(lease: LeaseDetails): boolean {
  return ["APPROVED", "ACTIVE", "EXPIRING"].includes(lease.status);
}

export function DepositCreateModal({
  canSelectLease,
  isSaving = false,
  onClose,
  onSave,
  onSaved,
  open,
}: DepositCreateModalProps) {
  const leasesQuery = useFinanceLeaseOptions(open && canSelectLease);
  const eligibleLeases = useMemo(
    () => (leasesQuery.data ?? []).filter(isDepositEligibleLease),
    [leasesQuery.data],
  );
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { lease: "" },
  });

  useEffect(() => {
    if (open) reset({ lease: "" });
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
    <CreateEditModal
      open={open}
      mode="create"
      entityName="deposit"
      description="Create a deposit using the amount recorded on the lease."
      onClose={close}
      onSubmit={(event) => void submit(event)}
      isSubmitting={isSaving || isSubmitting}
    >
      {submissionError && (
        <p role="alert" className="rounded-md border border-danger-subtle bg-danger-subtle p-3 text-sm text-danger">
          {submissionError}
        </p>
      )}
      {canSelectLease ? (
        leasesQuery.isLoading ? (
          <LoadingState
            label="Loading eligible leases"
            message="Loading leases eligible for a deposit…"
          />
        ) : leasesQuery.isError ? (
          <ErrorState
            title="Unable to load leases"
            description={getFinanceErrorMessage(leasesQuery.error)}
            onRetry={() => void leasesQuery.refetch()}
          />
        ) : eligibleLeases.length === 0 ? (
          <EmptyState
            title="No eligible leases"
            description="A deposit can only be created for an approved, active, or expiring lease."
          />
        ) : (
          <EntitySelector
            label="Lease"
            required
            options={eligibleLeases.map((lease) => ({
              value: lease.id,
              label: `${lease.lease_label || `${lease.tenant_name || lease.tenant_email || "Tenant"} · Unit ${lease.unit_number || "details unavailable"}`} · ${lease.status.toLowerCase().replace(/_/g, " ")} · deposit ${lease.deposit_amount}`,
            }))}
            error={errors.lease?.message}
            {...register("lease")}
          />
        )
      ) : (
        <Input
          label="Lease"
          required
          placeholder="Enter the lease reference"
          error={errors.lease?.message}
          {...register("lease")}
        />
      )}
    </CreateEditModal>
  );
}
