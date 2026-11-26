import { z } from "zod";

import { api } from "../../../services/api";
import { getApiErrorMessage } from "../../../services/apiError";
import { fetchListings } from "../../listings/api/listings.api";
import {
  applicationDetailsSchema,
  applicationSchema,
  screeningSchema,
  type Application,
  type ApplicationCollection,
  type ApplicationDetails,
  type ApplicationQueryParams,
  type ApplicationTransitionAction,
  type Screening,
  type ScreeningAction,
  type ScreeningResultInput,
} from "../types/application";

interface PaginatedApplicationResponse {
  count: number;
  results: unknown[];
}

function isPaginatedResponse(
  value: unknown,
): value is PaginatedApplicationResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

export async function fetchApplications(
  params: ApplicationQueryParams = {},
): Promise<ApplicationCollection> {
  const response = await api.get<unknown>("applications/", {
    params: { page_size: 20, ...params },
  });
  const payload = response.data;

  if (Array.isArray(payload)) {
    const results = z.array(applicationSchema).parse(payload);
    return { results, count: results.length };
  }
  if (isPaginatedResponse(payload)) {
    return {
      results: z.array(applicationSchema).parse(payload.results),
      count: payload.count,
    };
  }
  throw new Error("The server returned an invalid applications response.");
}

export async function fetchApplication(
  id: string,
): Promise<ApplicationDetails> {
  const response = await api.get<unknown>(`applications/${id}/`);
  return applicationDetailsSchema.parse(response.data);
}

export async function transitionApplication(
  id: string,
  action: ApplicationTransitionAction,
): Promise<ApplicationDetails> {
  const response = await api.post<unknown>(
    `applications/${id}/${action}/`,
    {},
  );
  return applicationDetailsSchema.parse(response.data);
}

export async function rejectApplication(
  id: string,
  rejectionReason: string,
): Promise<ApplicationDetails> {
  const response = await api.post<unknown>(
    `applications/${id}/reject/`,
    { rejection_reason: rejectionReason },
  );
  return applicationDetailsSchema.parse(response.data);
}

export async function transitionScreening(
  id: string,
  action: ScreeningAction,
  result: ScreeningResultInput = {},
): Promise<Screening> {
  const response = await api.post<unknown>(
    `screenings/${id}/${action}/`,
    action === "pass" || action === "fail" ? result : {},
  );
  return screeningSchema.parse(response.data);
}

export async function fetchAllApplicationListings() {
  const listings: Awaited<ReturnType<typeof fetchListings>>["results"] = [];
  let page = 1;
  let count = Number.POSITIVE_INFINITY;

  while (listings.length < count) {
    const collection = await fetchListings({ page });
    listings.push(...collection.results);
    count = collection.count;
    if (collection.results.length === 0) break;
    page += 1;
  }

  return listings;
}

export function getApplicationErrorMessage(error: unknown): string {
  return getApiErrorMessage(error);
}

export type { Application, ApplicationDetails, Screening };
