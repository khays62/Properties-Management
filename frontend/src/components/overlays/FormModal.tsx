import { useId, type FormEventHandler, type ReactNode } from "react";

import { Alert } from "../feedback/Alert";
import { Button, type ButtonVariant } from "../ui/Button";
import { Modal } from "./Modal";

export interface FormModalProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  submitLabel?: string;
  cancelLabel?: string;
  isSubmitting?: boolean;
  error?: ReactNode;
  submitVariant?: ButtonVariant;
  className?: string;
}

export function FormModal({
  cancelLabel = "Cancel",
  children,
  className,
  description,
  error,
  isSubmitting = false,
  onClose,
  onSubmit,
  open,
  submitLabel = "Save",
  submitVariant = "primary",
  title,
}: FormModalProps) {
  const formId = useId();

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      className={className}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant={submitVariant}
            isLoading={isSubmitting}
          >
            {submitLabel}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="space-y-5"
        onSubmit={onSubmit}
        noValidate
      >
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
        {children}
      </form>
    </Modal>
  );
}
