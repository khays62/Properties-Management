import type {
  ListingStatus,
  ListingTransitionAction,
} from "../types/listing";

export function getListingAvailableActions(
  status: ListingStatus,
): ListingTransitionAction[] {
  if (status === "DRAFT" || status === "PAUSED") return ["publish"];
  if (status === "PUBLISHED") return ["pause", "close"];
  return [];
}
