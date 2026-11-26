import { PropertyFormModal } from "./PropertyFormModal";
import { useUpdateProperty } from "../hooks/useProperties";
import type { Property } from "../types/property";

export interface PropertyEditModalProps {
  property: Property | null;
  onClose: () => void;
  onSaved?: () => void;
}

export function PropertyEditModal({
  onClose,
  onSaved,
  property,
}: PropertyEditModalProps) {
  const updateMutation = useUpdateProperty();

  if (!property) return null;

  return (
    <PropertyFormModal
      key={property.id}
      open
      mode="edit"
      property={property}
      isSaving={updateMutation.isPending}
      onClose={onClose}
      onSave={(values) =>
        updateMutation.mutateAsync({ id: property.id, values })
      }
      onSaved={onSaved}
    />
  );
}
