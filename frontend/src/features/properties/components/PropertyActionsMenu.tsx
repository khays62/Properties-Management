import { ActionDropdown } from "../../../components/overlays";
import type { Property } from "../types/property";

export interface PropertyActionsMenuProps {
  property: Property;
  canAssignManager: boolean;
  onView?: () => void;
  onEdit: () => void;
  onAssignManager: () => void;
  onArchive: () => void;
}

export function PropertyActionsMenu({
  canAssignManager,
  onArchive,
  onAssignManager,
  onEdit,
  onView,
  property,
}: PropertyActionsMenuProps) {
  return (
    <ActionDropdown
      label={`Actions for ${property.name}`}
      items={[
        ...(onView
          ? [{ id: "view", label: "View details", onSelect: onView }]
          : []),
        { id: "edit", label: "Edit property", onSelect: onEdit },
        ...(canAssignManager
          ? [
              {
                id: "assign-manager",
                label: "Assign manager",
                onSelect: onAssignManager,
              },
            ]
          : []),
        {
          id: "archive",
          label: "Archive property",
          variant: "danger",
          onSelect: onArchive,
        },
      ]}
    />
  );
}
