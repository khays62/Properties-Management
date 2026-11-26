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
  const archiveBlockedReason =
    property.status !== "ACTIVE"
      ? "Only active properties can be archived."
      : property.unit_count > 0
        ? `This property has ${property.unit_count} unit${property.unit_count === 1 ? "" : "s"}. Remove dependent records before archiving.`
        : undefined;

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
          disabled: Boolean(archiveBlockedReason),
          disabledReason: archiveBlockedReason,
          onSelect: onArchive,
        },
      ]}
    />
  );
}
