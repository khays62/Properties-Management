import { useState, type FormEvent } from "react";

import { FormModal } from "../../../components/overlays/FormModal";
import { Textarea } from "../../../components/ui/Textarea";

export interface ApplicationRejectionModalProps {
  open: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
}

export function ApplicationRejectionModal({
  isSubmitting = false,
  onClose,
  onSubmit,
  open,
}: ApplicationRejectionModalProps) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError("Enter a reason for rejecting this application.");
      return;
    }

    setError("");
    onSubmit(trimmedReason);
  }

  return (
    <FormModal
      open={open}
      title="Reject application"
      description="A clear reason is required and will be recorded with this application."
      onClose={() => {
        setReason("");
        setError("");
        onClose();
      }}
      onSubmit={handleSubmit}
      submitLabel="Reject application"
      submitVariant="danger"
      isSubmitting={isSubmitting}
    >
      <Textarea
        label="Rejection reason"
        value={reason}
        onChange={(event) => {
          setReason(event.currentTarget.value);
          if (error) setError("");
        }}
        rows={4}
        maxLength={2000}
        error={error}
        required
      />
    </FormModal>
  );
}
