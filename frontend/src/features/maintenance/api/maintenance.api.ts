import { z } from "zod";

import { fetchLeases } from "../../leases/api/leases.api";
import type { LeaseDetails } from "../../leases/types/lease";
import { fetchProperties } from "../../properties/api/properties.api";
import type { Property } from "../../properties/types/property";
import { fetchUnits } from "../../units/api/units.api";
import type { Unit } from "../../units/types/unit";
import { api } from "../../../services/api";
import { getApiErrorMessage } from "../../../services/apiError";
import {
  maintenanceActivitySchema,
  maintenanceAttachmentSchema,
  maintenanceTenantSchema,
  maintenanceTicketDetailsSchema,
  maintenanceTicketSchema,
  type MaintenanceAssignmentInput,
  type MaintenanceCollection,
  type MaintenanceCreateInput,
  type MaintenanceQueryParams,
  type MaintenanceResolveInput,
  type MaintenanceTenant,
  type MaintenanceTicket,
  type MaintenanceTicketDetails,
  type MaintenanceTransitionInput,
  type MaintenanceUpdateInput,
} from "../types/maintenance";

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

function parseCollection<T extends z.ZodType>(
  payload: unknown,
  schema: T,
): { results: z.infer<T>[]; count: number } {
  if (Array.isArray(payload)) {
    const results = z.array(schema).parse(payload);
    return { results, count: results.length };
  }
  if (isPagePayload(payload)) {
    return {
      results: z.array(schema).parse(payload.results),
      count: payload.count,
    };
  }
  throw new Error("The server returned an invalid maintenance response.");
}

export async function fetchMaintenanceTickets(
  params: MaintenanceQueryParams = {},
): Promise<MaintenanceCollection> {
  const response = await api.get<unknown>("maintenance-tickets/", { params });
  return parseCollection(response.data, maintenanceTicketSchema);
}

export async function fetchMaintenanceTicket(
  id: string,
): Promise<MaintenanceTicketDetails> {
  const response = await api.get<unknown>(`maintenance-tickets/${id}/`);
  return maintenanceTicketDetailsSchema.parse(response.data);
}

export async function createMaintenanceTicket(
  values: MaintenanceCreateInput,
): Promise<MaintenanceTicket> {
  const response = await api.post<unknown>("maintenance-tickets/", values);
  return maintenanceTicketSchema.parse(response.data);
}

export async function updateMaintenanceTicket(
  id: string,
  values: MaintenanceUpdateInput,
): Promise<MaintenanceTicket> {
  const response = await api.patch<unknown>(
    `maintenance-tickets/${id}/`,
    values,
  );
  return maintenanceTicketSchema.parse(response.data);
}

export async function assignMaintenanceTicket(
  id: string,
  values: MaintenanceAssignmentInput,
): Promise<MaintenanceTicket> {
  const response = await api.post<unknown>(
    `maintenance-tickets/${id}/assign/`,
    values,
  );
  return maintenanceTicketSchema.parse(response.data);
}

export async function startMaintenanceTicket(
  id: string,
  values: MaintenanceTransitionInput,
): Promise<MaintenanceTicket> {
  const response = await api.post<unknown>(
    `maintenance-tickets/${id}/start/`,
    values,
  );
  return maintenanceTicketSchema.parse(response.data);
}

export async function resolveMaintenanceTicket(
  id: string,
  values: MaintenanceResolveInput,
): Promise<MaintenanceTicket> {
  const response = await api.post<unknown>(
    `maintenance-tickets/${id}/resolve/`,
    values,
  );
  return maintenanceTicketSchema.parse(response.data);
}

export async function closeMaintenanceTicket(
  id: string,
  values: MaintenanceTransitionInput,
): Promise<MaintenanceTicket> {
  const response = await api.post<unknown>(
    `maintenance-tickets/${id}/close/`,
    values,
  );
  return maintenanceTicketSchema.parse(response.data);
}

export async function cancelMaintenanceTicket(
  id: string,
  values: MaintenanceTransitionInput,
): Promise<MaintenanceTicket> {
  const response = await api.post<unknown>(
    `maintenance-tickets/${id}/cancel/`,
    values,
  );
  return maintenanceTicketSchema.parse(response.data);
}

export async function fetchMaintenanceActivities(ticketId: string) {
  const response = await api.get<unknown>("maintenance-activities/", {
    params: { ticket: ticketId },
  });
  return parseCollection(response.data, maintenanceActivitySchema);
}

export async function uploadMaintenanceAttachment(
  ticketId: string,
  file: File,
): Promise<z.infer<typeof maintenanceAttachmentSchema>> {
  const data = new FormData();
  data.append("ticket", ticketId);
  data.append("file", file);
  const response = await api.post<unknown>(
    "maintenance-attachments/",
    data,
  );
  return maintenanceAttachmentSchema.parse(response.data);
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

export function fetchMaintenanceUnits(): Promise<Unit[]> {
  return fetchAllPages((page) => fetchUnits({ page }));
}

export function fetchMaintenanceProperties(): Promise<Property[]> {
  return fetchAllPages((page) => fetchProperties({ page }));
}

export function fetchMaintenanceTenants(): Promise<MaintenanceTenant[]> {
  return fetchAllPages(async (page) => {
    const response = await api.get<unknown>("tenants/", {
      params: { page_size: 20, page },
    });
    return parseCollection(response.data, maintenanceTenantSchema);
  });
}

export function fetchMaintenanceLeases(): Promise<LeaseDetails[]> {
  return fetchAllPages((page) => fetchLeases({ page }));
}

export function getMaintenanceErrorMessage(error: unknown): string {
  return getApiErrorMessage(error);
}

export type MaintenanceUnitOption = Pick<Unit, "id" | "unit_number" | "property" | "status">;
export type MaintenancePropertyOption = Pick<Property, "id" | "name" | "code">;
export type MaintenanceLeaseOption = Pick<LeaseDetails, "id" | "tenant" | "unit" | "status">;
