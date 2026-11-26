import type { ReactNode } from "react";

import { Alert } from "../feedback/Alert";
import { Button, type ButtonVariant } from "../ui/Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: ButtonVariant;
  isLoading?: boolean;
  error?: ReactNode;
  className?: string;
}

export function ConfirmDialog({
  cancelLabel = "Cancel",
  className,
  confirmLabel = "Confirm",
  confirmVariant = "primary",
  description,
  error,
  isLoading = false,
  onClose,
  onConfirm,
  open,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      className={className}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            disabled={isLoading}
            onClick={onClose}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            isLoading={isLoading}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="text-sm text-text-secondary">{description}</div>
        {error && (
          <Alert variant="danger" role="alert">
            {error}
          </Alert>
        )}
      </div>
    </Modal>
  );
}
