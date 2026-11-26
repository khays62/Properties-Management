import { z } from "zod";

import { api } from "../../../services/api";
import { getApiErrorMessage } from "../../../services/apiError";
import {
  listingDetailsSchema,
  listingSchema,
  type Listing,
  type ListingCollection,
  type ListingInput,
  type ListingQueryParams,
  type ListingDetails,
  type ListingTransitionAction,
  type ListingUpdateInput,
} from "../types/listing";

interface PaginatedListingResponse {
  count: number;
  results: unknown[];
}

function isPaginatedResponse(value: unknown): value is PaginatedListingResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

export async function fetchListings(
  params: ListingQueryParams = {},
): Promise<ListingCollection> {
  const response = await api.get<unknown>("listings/", {
    params: { page_size: 20, ...params },
  });
  const payload = response.data;

  if (Array.isArray(payload)) {
    const results = z.array(listingSchema).parse(payload);
    return { results, count: results.length };
  }
  if (isPaginatedResponse(payload)) {
    return {
      results: z.array(listingSchema).parse(payload.results),
      count: payload.count,
    };
  }
  throw new Error("The server returned an invalid listings response.");
}

export async function fetchListing(id: string): Promise<ListingDetails> {
  const response = await api.get<unknown>(`listings/${id}/`);
  return listingDetailsSchema.parse(response.data);
}

export async function createListing(values: ListingInput): Promise<Listing> {
  const response = await api.post<unknown>("listings/", values);
  return listingSchema.parse(response.data);
}

export async function updateListing(
  id: string,
  values: ListingUpdateInput,
): Promise<Listing> {
  const response = await api.patch<unknown>(`listings/${id}/`, values);
  return listingSchema.parse(response.data);
}

export async function transitionListing(
  id: string,
  action: ListingTransitionAction,
): Promise<Listing> {
  const response = await api.post<unknown>(`listings/${id}/${action}/`, {});
  return listingSchema.parse(response.data);
}

export { getApiErrorMessage as getListingErrorMessage };
