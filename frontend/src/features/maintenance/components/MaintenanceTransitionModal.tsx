import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { NotesField } from "../../../components/form";
import { FormModal } from "../../../components/overlays/FormModal";
import type {
  MaintenanceAction,
  MaintenanceResolveInput,
  MaintenanceTicket,
  MaintenanceTransitionInput,
} from "../types/maintenance";

const optionalNotesSchema = z.object({ notes: z.string() });
const resolutionSchema = z.object({
  resolution_notes: z.string().trim().min(1, "Resolution notes are required."),
});

type OptionalNotes = z.infer<typeof optionalNotesSchema>;
type ResolutionNotes = z.infer<typeof resolutionSchema>;

const ACTION_COPY: Record<
  Exclude<MaintenanceAction, "assign">,
  { title: string; description: string; label: string }
> = {
  start: {
    title: "Start maintenance work",
    description: "Move this assigned ticket into the in-progress state.",
    label: "Start work",
  },
  resolve: {
    title: "Resolve maintenance ticket",
    description: "Record the resolution notes required by the backend.",
    label: "Resolve ticket",
  },
  close: {
    title: "Close maintenance ticket",
    description: "Only a resolved ticket can be closed.",
    label: "Close ticket",
  },
  cancel: {
    title: "Cancel maintenance ticket",
    description: "Only an open ticket can be cancelled.",
    label: "Cancel ticket",
  },
};

export interface MaintenanceTransitionModalProps {
  ticket: MaintenanceTicket | null;
  action: Exclude<MaintenanceAction, "assign"> | null;
  isSaving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (
    values: MaintenanceTransitionInput | MaintenanceResolveInput,
  ) => Promise<unknown>;
  onSaved?: () => void;
}

export function MaintenanceTransitionModal({
  action,
  error,
  isSaving = false,
  onClose,
  onSaved,
  onSubmit,
  ticket,
}: MaintenanceTransitionModalProps) {
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const isResolve = action === "resolve";
  const optionalForm = useForm<OptionalNotes>({
    resolver: zodResolver(optionalNotesSchema),
    defaultValues: { notes: "" },
  });
  const resolutionForm = useForm<ResolutionNotes>({
    resolver: zodResolver(resolutionSchema),
    defaultValues: { resolution_notes: "" },
  });

  function close() {
    setSubmissionError(null);
    onClose();
  }

  const optionalSubmit = optionalForm.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onSaved?.();
      close();
    } catch (submitError) {
      setSubmissionError(
        submitError instanceof Error ? submitError.message : "The action failed.",
      );
    }
  });
  const resolutionSubmit = resolutionForm.handleSubmit(async (values) => {
    try {
      await onSubmit(values);
      onSaved?.();
      close();
    } catch (submitError) {
      setSubmissionError(
        submitError instanceof Error ? submitError.message : "The action failed.",
      );
    }
  });

  if (!ticket || !action) return null;
  const copy = ACTION_COPY[action];

  return (
    <FormModal
      open
      title={copy.title}
      description={copy.description}
      onClose={close}
      onSubmit={(event) => {
        if (isResolve) void resolutionSubmit(event);
        else void optionalSubmit(event);
      }}
      submitLabel={copy.label}
      submitVariant={action === "cancel" ? "danger" : "primary"}
      isSubmitting={
        isSaving ||
        (isResolve
          ? resolutionForm.formState.isSubmitting
          : optionalForm.formState.isSubmitting)
      }
      error={submissionError ?? error}
    >
      {isResolve ? (
        <NotesField
          label="Resolution notes"
          required
          error={resolutionForm.formState.errors.resolution_notes?.message}
          {...resolutionForm.register("resolution_notes")}
        />
      ) : (
        <NotesField
          label={action === "cancel" ? "Cancellation notes" : "Notes"}
          error={optionalForm.formState.errors.notes?.message}
          {...optionalForm.register("notes")}
        />
      )}
    </FormModal>
  );
}
