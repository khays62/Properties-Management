import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { ActionDropdown } from "../../../components/overlays";
import type { ActionDropdownItem } from "../../../components/overlays";
import { ConfirmDialog } from "../../../components/overlays/ConfirmDialog";
import { toastService } from "../../../services/toastService";
import { getListReturnPath } from "../../../utils/navigation";
import { getUnitErrorMessage } from "../api/units.api";
import { useArchiveUnit } from "../hooks/useUnits";
import type { Unit } from "../types/unit";

interface UnitActionsMenuProps {
  unit: Unit;
  onEdit: () => void;
  onArchived?: () => void;
}

export function UnitActionsMenu({
  onArchived,
  onEdit,
  unit,
}: UnitActionsMenuProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const archiveMutation = useArchiveUnit();

  const items: ActionDropdownItem[] = [
    {
      id: "view",
      label: "View details",
      onSelect: () => {
        const returnTo =
          location.pathname === "/units"
            ? `${location.pathname}${location.search}`
            : getListReturnPath(location.state, "/units", "");
        navigate(`/units/${unit.id}`, {
          state: returnTo ? { returnTo } : undefined,
        });
      },
    },
    {
      id: "edit",
      label: "Edit unit",
      onSelect: onEdit,
    },
    {
      id: "archive",
      label: unit.is_active ? "Archive unit" : "Unit archived",
      onSelect: () => setConfirmOpen(true),
      disabled: !unit.is_active,
      disabledReason: "This unit has already been archived.",
      variant: "danger",
    },
  ];

  const archive = async () => {
    try {
      await archiveMutation.mutateAsync(unit.id);
      setConfirmOpen(false);
      toastService.success("Unit archived.");
      onArchived?.();
    } catch (error) {
      toastService.error(getUnitErrorMessage(error));
    }
  };

  return (
    <>
      <ActionDropdown items={items} label={`Actions for unit ${unit.unit_number}`} />
      <ConfirmDialog
        open={confirmOpen}
        title="Archive unit?"
        description={`Archive unit ${unit.unit_number}? It will no longer be available for active property workflows.`}
        confirmLabel="Archive unit"
        confirmVariant="danger"
        isLoading={archiveMutation.isPending}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => void archive()}
      />
    </>
  );
}
