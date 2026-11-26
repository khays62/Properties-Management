import { useState } from "react";

import { ActionDropdown } from "../../../components/overlays";
import type { ActionDropdownItem } from "../../../components/overlays";
import { ConfirmDialog } from "../../../components/overlays/ConfirmDialog";
import { toastService } from "../../../services/toastService";
import { getListingErrorMessage } from "../api/listings.api";
import { useListingTransition } from "../hooks/useListings";
import type {
  Listing,
  ListingTransitionAction,
} from "../types/listing";
import { getListingAvailableActions } from "../utils/transitions";

const ACTION_LABELS: Record<ListingTransitionAction, string> = {
  publish: "Publish listing",
  pause: "Pause listing",
  close: "Close listing",
};

interface ListingActionsMenuProps {
  listing: Listing;
  onView?: () => void;
  onEdit: () => void;
}

export function ListingActionsMenu({
  listing,
  onEdit,
  onView,
}: ListingActionsMenuProps) {
  const [pendingAction, setPendingAction] =
    useState<ListingTransitionAction | null>(null);
  const transitionMutation = useListingTransition();
  const transitionActions = getListingAvailableActions(listing.status);

  const items: ActionDropdownItem[] = [
    ...(onView
      ? [
          {
            id: "view",
            label: "View details",
            onSelect: onView,
          },
        ]
      : []),
    {
      id: "edit",
      label: "Edit listing",
      onSelect: onEdit,
    },
    ...transitionActions.map((action): ActionDropdownItem => ({
      id: action,
      label: ACTION_LABELS[action],
      variant: action === "close" ? "danger" : "ghost",
      onSelect: () => setPendingAction(action),
    })),
  ];

  async function confirmTransition() {
    if (!pendingAction) return;
    try {
      await transitionMutation.mutateAsync({
        id: listing.id,
        action: pendingAction,
      });
      toastService.success(`${ACTION_LABELS[pendingAction]} successful.`);
      setPendingAction(null);
    } catch (error) {
      toastService.error(getListingErrorMessage(error));
    }
  }

  return (
    <>
      <ActionDropdown
        items={items}
        label={`Actions for ${listing.title}`}
      />
      {pendingAction && (
        <ConfirmDialog
          open
          title={`${ACTION_LABELS[pendingAction]}?`}
          description={
            pendingAction === "publish"
              ? "Publishing makes this listing publicly available and marks its unit as listed."
              : pendingAction === "pause"
                ? "Pausing removes the listing from public availability while leaving the unit listed."
                : "Closing removes the listing from public availability and returns the unit to available status."
          }
          confirmLabel={ACTION_LABELS[pendingAction]}
          confirmVariant={pendingAction === "close" ? "danger" : "primary"}
          isLoading={transitionMutation.isPending}
          onClose={() => setPendingAction(null)}
          onConfirm={() => void confirmTransition()}
        />
      )}
    </>
  );
}
