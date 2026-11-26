import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { fetchProperties } from "../../properties/api/properties.api";
import { propertyQueryKeys } from "../../properties/hooks/useProperties";
import { fetchUnits } from "../../units/api/units.api";
import { unitQueryKeys } from "../../units/hooks/useUnits";
import {
  createListing,
  fetchListing,
  fetchListings,
  transitionListing,
  updateListing,
} from "../api/listings.api";
import type {
  ListingInput,
  ListingQueryParams,
  ListingTransitionAction,
  ListingUpdateInput,
} from "../types/listing";

export const listingQueryKeys = {
  all: ["listings"] as const,
  lists: () => [...listingQueryKeys.all, "list"] as const,
  list: (params: ListingQueryParams) =>
    [...listingQueryKeys.lists(), params] as const,
  details: () => [...listingQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...listingQueryKeys.details(), id] as const,
  propertyOptions: () => [...listingQueryKeys.all, "property-options"] as const,
  availableUnits: (propertyId: string) =>
    [...listingQueryKeys.all, "available-units", propertyId] as const,
};

async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ count: number; results: T[] }>,
): Promise<T[]> {
  const results: T[] = [];
  let page = 1;
  let count = Number.POSITIVE_INFINITY;

  while (results.length < count) {
    const collection = await fetchPage(page);
    results.push(...collection.results);
    count = collection.count;
    if (collection.results.length === 0) break;
    page += 1;
  }

  return results;
}

function invalidateListingData(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: listingQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: listingQueryKeys.details() }),
    queryClient.invalidateQueries({ queryKey: unitQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: propertyQueryKeys.all }),
  ]);
}

export function useListings(params: ListingQueryParams) {
  return useQuery({
    queryKey: listingQueryKeys.list(params),
    queryFn: () => fetchListings(params),
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: listingQueryKeys.detail(id),
    queryFn: () => fetchListing(id),
    enabled: id.length > 0,
  });
}

export function useListingProperties(enabled = true) {
  return useQuery({
    queryKey: listingQueryKeys.propertyOptions(),
    queryFn: () =>
      fetchAllPages((page) => fetchProperties({ page })),
    enabled,
  });
}

export function useAvailableListingUnits(propertyId: string, enabled = true) {
  return useQuery({
    queryKey: listingQueryKeys.availableUnits(propertyId),
    queryFn: () =>
      fetchAllPages((page) =>
        fetchUnits({ property: propertyId, status: "AVAILABLE", page }),
      ),
    enabled: enabled && propertyId.length > 0,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: ListingInput) => createListing(values),
    onSuccess: () => invalidateListingData(queryClient),
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: ListingUpdateInput }) =>
      updateListing(id, values),
    onSuccess: () => invalidateListingData(queryClient),
  });
}

export function useListingTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: ListingTransitionAction;
    }) => transitionListing(id, action),
    onSuccess: () => invalidateListingData(queryClient),
  });
}
