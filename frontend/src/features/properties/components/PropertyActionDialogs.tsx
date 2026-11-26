import { DeleteConfirmDialog } from "../../../components/overlays";
import { getPropertyErrorMessage } from "../api/properties.api";
import { useArchiveProperty } from "../hooks/useProperties";
import { toastService } from "../../../services/toastService";
import type { Property } from "../types/property";
import { PropertyAssignmentModal } from "./PropertyAssignmentModal";
import { PropertyEditModal } from "./PropertyEditModal";

export interface PropertyActionDialogsProps {
  editingProperty: Property | null;
  assigningProperty: Property | null;
  archivingProperty: Property | null;
  onCloseEdit: () => void;
  onCloseAssignment: () => void;
  onCloseArchive: () => void;
  onSaved: (message: string) => void;
  onArchived: () => void;
}

export function PropertyActionDialogs({
  archivingProperty,
  assigningProperty,
  editingProperty,
  onArchived,
  onCloseArchive,
  onCloseAssignment,
  onCloseEdit,
  onSaved,
}: PropertyActionDialogsProps) {
  const archiveMutation = useArchiveProperty();

  async function confirmArchive() {
    if (!archivingProperty) return;
    try {
      await archiveMutation.mutateAsync(archivingProperty.id);
      toastService.success("Property archived.");
      onArchived();
    } catch (error) {
      toastService.error(getPropertyErrorMessage(error));
    }
  }

  return (
    <>
      <PropertyEditModal
        property={editingProperty}
        onClose={onCloseEdit}
        onSaved={() => onSaved("Property updated.")}
      />
      <PropertyAssignmentModal
        property={assigningProperty}
        onClose={onCloseAssignment}
        onAssigned={() => onSaved("Property manager assigned.")}
      />
      <DeleteConfirmDialog
        open={archivingProperty !== null}
        entityName="property"
        title="Archive property?"
        description={archivingProperty
          ? `“${archivingProperty.name}” will be archived, not permanently deleted. Archival is blocked while units, listings, applications, leases, maintenance records, or financial records exist.`
          : ""}
        confirmLabel="Archive property"
        onClose={onCloseArchive}
        onConfirm={() => void confirmArchive()}
        isLoading={archiveMutation.isPending}
      />
    </>
  );
}
