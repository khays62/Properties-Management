import { z } from "zod";

import { api } from "../../../services/api";
import { getApiErrorMessage } from "../../../services/apiError";
import {
  applicationSchema,
  type Application,
} from "../../applications/types/application";
import {
  publicListingSchema,
  type PublicApplicationInput,
  type PublicListing,
} from "../types/marketplace";

export interface PublicListingQueryParams {
  search?: string;
  city?: string;
  available_date?: string;
  page?: number;
}

export interface PublicListingCollection {
  count: number;
  results: PublicListing[];
}

interface PaginatedResponse {
  count: number;
  results: unknown[];
}

function isPaginatedResponse(value: unknown): value is PaginatedResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

export async function fetchPublicListings(
  params: PublicListingQueryParams = {},
): Promise<PublicListingCollection> {
  const response = await api.get<unknown>("listings/public/", {
    params: { page_size: 20, ...params },
  });
  if (!isPaginatedResponse(response.data)) {
    throw new Error("The server returned an invalid public listings response.");
  }

  return {
    count: response.data.count,
    results: z.array(publicListingSchema).parse(response.data.results),
  };
}

export async function fetchPublicListing(
  listingId: string,
): Promise<PublicListing> {
  const response = await api.get<unknown>(
    `listings/public/${encodeURIComponent(listingId)}/`,
  );
  return publicListingSchema.parse(response.data);
}

export async function submitPublicApplication(
  values: PublicApplicationInput,
): Promise<Application> {
  const response = await api.post<unknown>("applications/", values);
  return applicationSchema.parse(response.data);
}

export { getApiErrorMessage as getMarketplaceErrorMessage };
