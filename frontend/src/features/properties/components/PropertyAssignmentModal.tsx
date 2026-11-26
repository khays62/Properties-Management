import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Alert } from "../../../components/feedback/Alert";
import { FormModal } from "../../../components/overlays";
import { Input } from "../../../components/ui/Input";
import { getPropertyErrorMessage } from "../api/properties.api";
import { useAssignPropertyManager } from "../hooks/useProperties";
import type { Property } from "../types/property";

const assignmentSchema = z.object({
  manager_email: z.string().trim().email("Enter a valid manager email address."),
});

type AssignmentFormValues = z.infer<typeof assignmentSchema>;

export interface PropertyAssignmentModalProps {
  property: Property | null;
  onClose: () => void;
  onAssigned?: () => void;
}

export function PropertyAssignmentModal({
  onAssigned,
  onClose,
  property,
}: PropertyAssignmentModalProps) {
  const assignMutation = useAssignPropertyManager();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    reset,
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { manager_email: "" },
  });

  useEffect(() => {
    if (!property) return;
    reset({ manager_email: "" });
  }, [property, reset]);

  function closeModal() {
    setSubmitError(null);
    onClose();
  }

  const submit = handleSubmit(async ({ manager_email }) => {
    if (!property) return;
    setSubmitError(null);
    try {
      await assignMutation.mutateAsync({
        propertyId: property.id,
        managerEmail: manager_email,
      });
      onAssigned?.();
      closeModal();
    } catch (error) {
      setSubmitError(getPropertyErrorMessage(error));
    }
  });

  return (
    <FormModal
      open={property !== null}
      title="Assign property manager"
      description={
        property
          ? `Assign an active property manager to ${property.name}.`
          : undefined
      }
      onClose={closeModal}
      onSubmit={(event) => void submit(event)}
      submitLabel="Assign manager"
      isSubmitting={isSubmitting || assignMutation.isPending}
      error={submitError}
    >
      {property && (
        <div className="space-y-4">
          <Alert variant="info">
            The manager must have an active Property Manager account.
          </Alert>
          <Input
            type="email"
            label="Property manager email"
            autoComplete="email"
            required
            error={errors.manager_email?.message}
            {...register("manager_email")}
          />
        </div>
      )}
    </FormModal>
  );
}
