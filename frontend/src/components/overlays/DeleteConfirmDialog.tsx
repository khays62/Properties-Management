import type { ReactNode } from "react";

import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog";

export interface DeleteConfirmDialogProps
  extends Omit<ConfirmDialogProps, "title" | "description" | "confirmLabel" | "confirmVariant"> {
  entityName: string;
  description?: ReactNode;
  title?: string;
  confirmLabel?: string;
}

export function DeleteConfirmDialog({
  confirmLabel,
  description,
  entityName,
  title,
  ...props
}: DeleteConfirmDialogProps) {
  const entity = entityName.trim();
  return (
    <ConfirmDialog
      {...props}
      title={title ?? `Delete ${entity}?`}
      description={
        description ??
        `This action cannot be undone. The ${entity} will be permanently deleted.`
      }
      confirmLabel={confirmLabel ?? `Delete ${entity}`}
      confirmVariant="danger"
    />
  );
}
