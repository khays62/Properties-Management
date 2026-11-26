import { useUpdateUnit } from "../hooks/useUnits";
import type { UnitInput } from "../types/unit";
import { UnitFormModal } from "./UnitFormModal";
import type { UnitFormModalProps } from "./UnitFormModal";

type UnitEditModalProps = Pick<
  UnitFormModalProps,
  "open" | "onClose" | "onSaved" | "properties" | "unit"
> & {
  unitId: string;
};

export function UnitEditModal({ unitId, ...props }: UnitEditModalProps) {
  const updateMutation = useUpdateUnit();

  return (
    <UnitFormModal
      {...props}
      mode="edit"
      isSaving={updateMutation.isPending}
      onSave={(values: UnitInput) =>
        updateMutation.mutateAsync({ id: unitId, values })
      }
    />
  );
}
