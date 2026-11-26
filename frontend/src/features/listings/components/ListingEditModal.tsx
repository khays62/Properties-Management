import { useUpdateListing } from "../hooks/useListings";
import type { Listing } from "../types/listing";
import { ListingFormModal } from "./ListingFormModal";
import type { ListingFormModalProps } from "./ListingFormModal";

type ListingEditModalProps = Pick<
  ListingFormModalProps,
  "open" | "onClose" | "onSaved"
> & {
  listing: Listing;
};

export function ListingEditModal({
  listing,
  ...props
}: ListingEditModalProps) {
  const updateMutation = useUpdateListing();

  return (
    <ListingFormModal
      {...props}
      mode="edit"
      listing={listing}
      isSaving={updateMutation.isPending}
      onUpdate={(values) =>
        updateMutation.mutateAsync({ id: listing.id, values })
      }
    />
  );
}
