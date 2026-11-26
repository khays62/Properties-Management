import { useState } from "react";

import { DeleteConfirmDialog } from "../../../components/overlays";
import { getPropertyErrorMessage } from "../api/properties.api";
import { useArchiveProperty } from "../hooks/useProperties";
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
  const [archiveError, setArchiveError] = useState<string | null>(null);

  async function confirmArchive() {
    if (!archivingProperty) return;
    setArchiveError(null);
    try {
      await archiveMutation.mutateAsync(archivingProperty.id);
      onArchived();
    } catch (error) {
      setArchiveError(getPropertyErrorMessage(error));
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
        description={
          archivingProperty
            ? `“${archivingProperty.name}” will be archived and removed from active property lists. This does not permanently delete its records.`
            : ""
        }
        confirmLabel="Archive property"
        onClose={() => {
          setArchiveError(null);
          onCloseArchive();
        }}
        onConfirm={() => void confirmArchive()}
        isLoading={archiveMutation.isPending}
        error={archiveError}
      />
    </>
  );
}
