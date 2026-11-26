import { ConfirmDialog } from "../../../components/overlays/ConfirmDialog";
import { toastService } from "../../../services/toastService";
import { getLeaseErrorMessage } from "../api/leases.api";
import { useLeaseRenewal, useLeaseTransition } from "../hooks/useLeases";
import type {
  LeaseAction,
  LeaseDetails,
  LeaseRenewalInput,
} from "../types/lease";
import { LeaseRenewalModal } from "./LeaseRenewalModal";

type ConfirmableLeaseAction = Exclude<LeaseAction, "renew">;

const CONFIRMATION_COPY: Record<
  ConfirmableLeaseAction,
  { title: string; description: string; label: string }
> = {
  "submit-for-approval": {
    title: "Submit lease for approval",
    description:
      "The draft lease will move to pending approval. The unit period is checked for conflicts.",
    label: "Submit for approval",
  },
  approve: {
    title: "Approve lease",
    description:
      "The lease will be approved and the approving account recorded.",
    label: "Approve lease",
  },
  activate: {
    title: "Activate lease",
    description:
      "Activation marks the tenant active. For a new tenancy it also closes the listing and marks the unit occupied.",
    label: "Activate lease",
  },
  terminate: {
    title: "Terminate lease",
    description:
      "This ends the active lease and releases its unit. The listing will remain closed.",
    label: "Terminate lease",
  },
  expire: {
    title: "Expire lease",
    description:
      "This ends an eligible lease after its end date and releases its unit.",
    label: "Expire lease",
  },
};

export interface LeaseWorkflowDialogsProps {
  lease: LeaseDetails | null;
  action: LeaseAction | null;
  onClose: () => void;
}

export function LeaseWorkflowDialogs({
  action,
  lease,
  onClose,
}: LeaseWorkflowDialogsProps) {
  const transitionMutation = useLeaseTransition();
  const renewalMutation = useLeaseRenewal();
  const isRenewal = action === "renew";
  const confirmableAction =
    action && action !== "renew" ? action : null;

  async function submitTransition() {
    if (!lease || !confirmableAction) return;
    try {
      await transitionMutation.mutateAsync({
        id: lease.id,
        action: confirmableAction,
      });
      toastService.success(
        confirmableAction === "submit-for-approval"
          ? "Lease submitted for approval."
          : `Lease ${confirmableAction === "approve" ? "approved" : confirmableAction === "activate" ? "activated" : confirmableAction === "terminate" ? "terminated" : "expired"}.`,
      );
      onClose();
    } catch (error) {
      toastService.error(getLeaseErrorMessage(error));
    }
  }

  async function submitRenewal(values: LeaseRenewalInput) {
    if (!lease) return;
    try {
      await renewalMutation.mutateAsync({ id: lease.id, values });
      toastService.success("Successor lease submitted for approval.");
      onClose();
    } catch (error) {
      toastService.error(getLeaseErrorMessage(error));
    }
  }

  if (!lease || !action) return null;

  if (isRenewal) {
    return (
      <LeaseRenewalModal
        key={`lease-renewal-${lease.id}`}
        open
        lease={lease}
        isSubmitting={renewalMutation.isPending}
        onClose={onClose}
        onSubmit={submitRenewal}
      />
    );
  }

  const copy = CONFIRMATION_COPY[confirmableAction as ConfirmableLeaseAction];
  return (
    <ConfirmDialog
      open
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.label}
      confirmVariant={
        confirmableAction === "terminate" || confirmableAction === "expire"
          ? "danger"
          : "primary"
      }
      isLoading={transitionMutation.isPending}
      onClose={onClose}
      onConfirm={() => void submitTransition()}
    />
  );
}
