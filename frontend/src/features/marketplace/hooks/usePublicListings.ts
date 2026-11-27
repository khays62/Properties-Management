import {
  useMutation,
  useQuery,
} from "@tanstack/react-query";

import {
  fetchPublicListing,
  fetchPublicListings,
  submitPublicApplication,
  type PublicListingQueryParams,
} from "../api/publicListings.api";
import type { PublicApplicationInput } from "../types/marketplace";

export const publicListingQueryKeys = {
  all: ["public-listings"] as const,
  lists: () => [...publicListingQueryKeys.all, "list"] as const,
  list: (params: PublicListingQueryParams) =>
    [...publicListingQueryKeys.lists(), params] as const,
  details: () => [...publicListingQueryKeys.all, "detail"] as const,
  detail: (listingId: string) =>
    [...publicListingQueryKeys.details(), listingId] as const,
};

export function usePublicListings(params: PublicListingQueryParams) {
  return useQuery({
    queryKey: publicListingQueryKeys.list(params),
    queryFn: () => fetchPublicListings(params),
  });
}

export function usePublicListing(listingId: string) {
  return useQuery({
    queryKey: publicListingQueryKeys.detail(listingId),
    queryFn: () => fetchPublicListing(listingId),
    enabled: listingId.length > 0,
  });
}

export function useSubmitPublicApplication() {
  return useMutation({
    mutationFn: (values: PublicApplicationInput) =>
      submitPublicApplication(values),
  });
}
