import { z } from "zod";

import { fetchApplications } from "../../applications/api/applications.api";
import type { Application } from "../../applications/types/application";
import { fetchProperties } from "../../properties/api/properties.api";
import type { Property } from "../../properties/types/property";
import { fetchUnits } from "../../units/api/units.api";
import type { Unit } from "../../units/types/unit";
import { api } from "../../../services/api";
import { getApiErrorMessage } from "../../../services/apiError";
import {
  leaseDetailsSchema,
  leaseSchema,
  type Lease,
  type LeaseCollection,
  type LeaseCreateInput,
  type LeaseDetails,
  type LeaseQueryParams,
  type LeaseRenewalInput,
  type LeaseTransitionAction,
} from "../types/lease";

interface PaginatedLeaseResponse {
  count: number;
  results: unknown[];
}

function isPaginatedResponse(value: unknown): value is PaginatedLeaseResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

export async function fetchLeases(
  params: LeaseQueryParams = {},
): Promise<LeaseCollection> {
  const response = await api.get<unknown>("leases/", {
    params: { page_size: 20, ...params },
  });
  const payload = response.data;

  if (Array.isArray(payload)) {
    const results = z.array(leaseDetailsSchema).parse(payload);
    return { results, count: results.length };
  }
  if (isPaginatedResponse(payload)) {
    return {
      results: z.array(leaseDetailsSchema).parse(payload.results),
      count: payload.count,
    };
  }
  throw new Error("The server returned an invalid leases response.");
}

export async function fetchLease(id: string): Promise<LeaseDetails> {
  const response = await api.get<unknown>(`leases/${id}/`);
  return leaseDetailsSchema.parse(response.data);
}

export async function createLease(values: LeaseCreateInput): Promise<Lease> {
  const response = await api.post<unknown>("leases/", values);
  return leaseSchema.parse(response.data);
}

export async function transitionLease(
  id: string,
  action: LeaseTransitionAction,
): Promise<LeaseDetails> {
  const response = await api.post<unknown>(`leases/${id}/${action}/`, {});
  return leaseDetailsSchema.parse(response.data);
}

export async function renewLease(
  id: string,
  values: LeaseRenewalInput,
): Promise<LeaseDetails> {
  const response = await api.post<unknown>(`leases/${id}/renew/`, values);
  return leaseDetailsSchema.parse(response.data);
}

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

export function fetchLeaseProperties(): Promise<Property[]> {
  return fetchAllPages((page) => fetchProperties({ page }));
}

export function fetchLeaseUnits(): Promise<Unit[]> {
  return fetchAllPages((page) => fetchUnits({ page }));
}

export function fetchLeaseApplications(): Promise<Application[]> {
  return fetchAllPages((page) =>
    fetchApplications({ status: "APPROVED", page }),
  );
}

export function getLeaseErrorMessage(error: unknown): string {
  return getApiErrorMessage(error);
}
