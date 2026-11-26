import { useCreateUnit } from "../hooks/useUnits";
import type { UnitInput } from "../types/unit";
import { UnitFormModal } from "./UnitFormModal";
import type { UnitFormModalProps } from "./UnitFormModal";

type UnitCreateModalProps = Pick<
  UnitFormModalProps,
  "open" | "onClose" | "onSaved" | "properties" | "initialPropertyId"
>;

export function UnitCreateModal(props: UnitCreateModalProps) {
  const createMutation = useCreateUnit();

  return (
    <UnitFormModal
      {...props}
      mode="create"
      isSaving={createMutation.isPending}
      onSave={(values: UnitInput) => createMutation.mutateAsync(values)}
    />
  );
}
