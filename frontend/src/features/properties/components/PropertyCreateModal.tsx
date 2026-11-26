import { PropertyFormModal } from "./PropertyFormModal";
import { useCreateProperty } from "../hooks/useProperties";

export interface PropertyCreateModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function PropertyCreateModal({
  onClose,
  onCreated,
  open,
}: PropertyCreateModalProps) {
  const createMutation = useCreateProperty();

  return (
    <PropertyFormModal
      open={open}
      mode="create"
      isSaving={createMutation.isPending}
      onClose={onClose}
      onSave={(values) => createMutation.mutateAsync(values)}
      onSaved={onCreated}
    />
  );
}
