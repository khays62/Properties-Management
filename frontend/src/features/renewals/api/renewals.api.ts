import { z } from "zod";

import { api } from "../../../services/api";
import { getApiErrorMessage } from "../../../services/apiError";
import {
  renewalAlertSchema,
  type RenewalAlert,
  type RenewalAlertCollection,
  type RenewalAlertQueryParams,
} from "../types/renewal";

interface PagePayload {
  count: number;
  results: unknown[];
}

function isPagePayload(value: unknown): value is PagePayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

function parseCollection(payload: unknown): RenewalAlertCollection {
  if (Array.isArray(payload)) {
    const results = z.array(renewalAlertSchema).parse(payload);
    return { results, count: results.length };
  }
  if (isPagePayload(payload)) {
    return {
      results: z.array(renewalAlertSchema).parse(payload.results),
      count: payload.count,
    };
  }
  throw new Error("The server returned an invalid renewal alert response.");
}

export async function fetchRenewalAlerts(
  params: RenewalAlertQueryParams = {},
): Promise<RenewalAlertCollection> {
  const response = await api.get<unknown>("renewal-alerts/", { params });
  return parseCollection(response.data);
}

export async function fetchRenewalAlert(id: string): Promise<RenewalAlert> {
  const response = await api.get<unknown>(`renewal-alerts/${id}/`);
  return renewalAlertSchema.parse(response.data);
}

export async function generateRenewalAlerts(): Promise<RenewalAlert[]> {
  const response = await api.post<unknown>("renewal-alerts/generate/", {});
  return z.array(renewalAlertSchema).parse(response.data);
}

export async function markRenewalAlertRead(id: string): Promise<RenewalAlert> {
  const response = await api.post<unknown>(
    `renewal-alerts/${id}/mark-read/`,
    {},
  );
  return renewalAlertSchema.parse(response.data);
}

export async function resolveRenewalAlert(id: string): Promise<RenewalAlert> {
  const response = await api.post<unknown>(
    `renewal-alerts/${id}/resolve/`,
    {},
  );
  return renewalAlertSchema.parse(response.data);
}

export function getRenewalErrorMessage(error: unknown): string {
  return getApiErrorMessage(error);
}
