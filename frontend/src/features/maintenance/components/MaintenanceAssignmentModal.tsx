import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { FormModal } from "../../../components/overlays/FormModal";
import { NotesField } from "../../../components/form";
import { Input } from "../../../components/ui/Input";
import { useAuth } from "../../../hooks/useAuth";
import type {
  MaintenanceAssignmentInput,
  MaintenanceTicket,
} from "../types/maintenance";
import { getMaintenanceErrorMessage } from "../api/maintenance.api";

const schema = z.object({
  assigned_to: z.string().uuid("Enter a valid property manager UUID."),
  notes: z.string(),
});

type FormValues = z.infer<typeof schema>;

export interface MaintenanceAssignmentModalProps {
  ticket: MaintenanceTicket | null;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (values: MaintenanceAssignmentInput) => Promise<unknown>;
  onSaved?: () => void;
}

export function MaintenanceAssignmentModal({
  isSaving = false,
  onClose,
  onSave,
  onSaved,
  ticket,
}: MaintenanceAssignmentModalProps) {
  const { user } = useAuth();
  const isPropertyManager = user?.role === "PROPERTY_MANAGER";
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { assigned_to: "", notes: "" },
  });

  useEffect(() => {
    if (ticket) {
      reset({
        assigned_to: isPropertyManager ? user?.id ?? "" : "",
        notes: "",
      });
    }
  }, [isPropertyManager, reset, ticket, user?.id]);

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
      setSubmissionError(getMaintenanceErrorMessage(error));
    }
  });

  return (
    <FormModal
      open={Boolean(ticket)}
      title="Assign maintenance ticket"
      description={
        ticket
          ? `Assign ticket "${ticket.title}". Only an assigned property manager can be selected; the backend verifies the manager's property assignment.`
          : undefined
      }
      onClose={close}
      onSubmit={(event) => void submit(event)}
      submitLabel="Assign ticket"
      isSubmitting={isSaving || isSubmitting}
      error={submissionError}
    >
      {isPropertyManager ? (
        <Input
          label="Assigned property manager"
          value={`${user?.email ?? ""} (${user?.id ?? ""})`}
          readOnly
          helperText="This ticket will be assigned to your account."
        />
      ) : (
        <Input
          label="Property manager UUID"
          placeholder="Enter the manager UUID"
          required
          error={errors.assigned_to?.message}
          {...register("assigned_to")}
        />
      )}
      <NotesField
        label="Assignment notes"
        {...register("notes")}
      />
      {isPropertyManager && (
        <input
          type="hidden"
          {...register("assigned_to")}
          value={user?.id ?? ""}
        />
      )}
    </FormModal>
  );
}
