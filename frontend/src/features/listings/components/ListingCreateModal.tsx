import { useCreateListing } from "../hooks/useListings";
import { ListingFormModal } from "./ListingFormModal";
import type { ListingFormModalProps } from "./ListingFormModal";

type ListingCreateModalProps = Pick<
  ListingFormModalProps,
  "open" | "onClose" | "onSaved"
>;

export function ListingCreateModal(props: ListingCreateModalProps) {
  const createMutation = useCreateListing();

  return (
    <ListingFormModal
      {...props}
      mode="create"
      isSaving={createMutation.isPending}
      onCreate={(values) => createMutation.mutateAsync(values)}
    />
  );
}
