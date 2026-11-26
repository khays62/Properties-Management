import { toastService } from "../../../services/toastService";
import {
  useAssignMaintenanceTicket,
  useCancelMaintenanceTicket,
  useCloseMaintenanceTicket,
  useResolveMaintenanceTicket,
  useStartMaintenanceTicket,
} from "../hooks/useMaintenance";
import type {
  MaintenanceAction,
  MaintenanceAssignmentInput,
  MaintenanceResolveInput,
  MaintenanceTicket,
  MaintenanceTransitionInput,
} from "../types/maintenance";
import { MaintenanceAssignmentModal } from "./MaintenanceAssignmentModal";
import { MaintenanceTransitionModal } from "./MaintenanceTransitionModal";

export interface MaintenanceWorkflowDialogsProps {
  ticket: MaintenanceTicket | null;
  action: MaintenanceAction | null;
  onClose: () => void;
}

export function MaintenanceWorkflowDialogs({
  action,
  onClose,
  ticket,
}: MaintenanceWorkflowDialogsProps) {
  const assignMutation = useAssignMaintenanceTicket();
  const startMutation = useStartMaintenanceTicket();
  const resolveMutation = useResolveMaintenanceTicket();
  const closeMutation = useCloseMaintenanceTicket();
  const cancelMutation = useCancelMaintenanceTicket();

  async function assign(values: MaintenanceAssignmentInput) {
    if (!ticket) return;
    await assignMutation.mutateAsync({ id: ticket.id, values });
  }

  async function transition(
    values: MaintenanceTransitionInput | MaintenanceResolveInput,
  ) {
    if (!ticket || !action || action === "assign") return;
    if (action === "resolve") {
      if (!("resolution_notes" in values)) {
        throw new Error("Resolution notes are required.");
      }
      return resolveMutation.mutateAsync({
        id: ticket.id,
        values,
      });
    }
    if ("resolution_notes" in values) {
      throw new Error("This maintenance action does not accept resolution notes.");
    }
    if (action === "start") {
      return startMutation.mutateAsync({
        id: ticket.id,
        values,
      });
    }
    if (action === "close") {
      return closeMutation.mutateAsync({
        id: ticket.id,
        values,
      });
    }
    return cancelMutation.mutateAsync({
      id: ticket.id,
      values,
    });
  }

  const mutation =
    action === "start"
      ? startMutation
      : action === "resolve"
        ? resolveMutation
        : action === "close"
          ? closeMutation
          : cancelMutation;

  if (!ticket || !action) return null;
  if (action === "assign") {
    return (
      <MaintenanceAssignmentModal
        key={`maintenance-assign-${ticket.id}`}
        ticket={ticket}
        isSaving={assignMutation.isPending}
        onClose={onClose}
        onSave={assign}
        onSaved={() => toastService.success("Maintenance ticket assigned.")}
      />
    );
  }

  return (
    <MaintenanceTransitionModal
      key={`maintenance-${action}-${ticket.id}`}
      ticket={ticket}
      action={action}
      isSaving={mutation.isPending}
      onClose={onClose}
      onSubmit={transition}
      onSaved={() =>
        toastService.success(
          action === "start"
            ? "Maintenance work started."
            : action === "resolve"
              ? "Maintenance ticket resolved."
              : action === "close"
                ? "Maintenance ticket closed."
                : "Maintenance ticket cancelled.",
        )
      }
    />
  );
}
