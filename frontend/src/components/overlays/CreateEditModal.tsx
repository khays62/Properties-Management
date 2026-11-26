import type { FormModalProps } from "./FormModal";
import { FormModal } from "./FormModal";

export interface CreateEditModalProps
  extends Omit<FormModalProps, "title" | "submitLabel"> {
  mode: "create" | "edit";
  entityName: string;
  title?: string;
  submitLabel?: string;
}

export function CreateEditModal({
  entityName,
  mode,
  submitLabel,
  title,
  ...props
}: CreateEditModalProps) {
  const label = entityName.trim();
  return (
    <FormModal
      {...props}
      title={title ?? `${mode === "create" ? "Create" : "Edit"} ${label}`}
      submitLabel={
        submitLabel ?? (mode === "create" ? `Create ${label}` : "Save changes")
      }
    />
  );
}
