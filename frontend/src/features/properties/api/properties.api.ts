import axios from "axios";
import { z } from "zod";

import { api } from "../../../services/api";
import {
  propertyDetailsSchema,
  propertySchema,
  type Property,
  type PropertyAssignment,
  type PropertyCollection,
  type PropertyInput,
  type PropertyQueryParams,
  type PropertyDetails,
} from "../types/property";

const assignmentSchema: z.ZodType<PropertyAssignment> = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  manager: z.string().uuid(),
  assigned_date: z.string(),
  is_active: z.boolean(),
});

interface PaginatedPropertyResponse {
  count: number;
  results: unknown[];
}

function isPaginatedResponse(value: unknown): value is PaginatedPropertyResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

export async function fetchProperties(
  params: PropertyQueryParams = {},
): Promise<PropertyCollection> {
  const response = await api.get<unknown>("properties/", {
    params: { page_size: 20, ...params },
  });
  const payload = response.data;

  if (Array.isArray(payload)) {
    const results = z.array(propertySchema).parse(payload);
    return { results, count: results.length };
  }
  if (isPaginatedResponse(payload)) {
    return {
      results: z.array(propertySchema).parse(payload.results),
      count: payload.count,
    };
  }
  throw new Error("The server returned an invalid properties response.");
}

export async function fetchProperty(id: string): Promise<PropertyDetails> {
  const response = await api.get<unknown>(`properties/${id}/`);
  return propertyDetailsSchema.parse(response.data);
}

export async function createProperty(
  values: PropertyInput,
): Promise<Property> {
  const response = await api.post<unknown>("properties/", values);
  return propertySchema.parse(response.data);
}

export async function updateProperty(
  id: string,
  values: PropertyInput,
): Promise<Property> {
  const response = await api.patch<unknown>(`properties/${id}/`, values);
  return propertySchema.parse(response.data);
}

export async function archiveProperty(id: string): Promise<Property> {
  const response = await api.post<unknown>(`properties/${id}/archive/`);
  return propertySchema.parse(response.data);
}

export async function assignPropertyManager(
  id: string,
  managerEmail: string,
): Promise<PropertyAssignment> {
  const response = await api.post<unknown>(
    `properties/${id}/assign-manager/`,
    { manager_email: managerEmail },
  );
  return assignmentSchema.parse(response.data);
}

export function getPropertyErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const payload: unknown = error.response?.data;
    if (typeof payload === "string") return payload;
    if (typeof payload === "object" && payload !== null) {
      if ("detail" in payload && typeof payload.detail === "string") {
        return payload.detail;
      }
      for (const value of Object.values(payload)) {
        if (typeof value === "string") return value;
        if (Array.isArray(value)) {
          const message = value.find(
            (item): item is string => typeof item === "string",
          );
          if (message) return message;
        }
      }
    }
    if (!error.response) {
      return "Unable to reach the server. Check your connection and try again.";
    }
  }
  if (error instanceof z.ZodError) {
    return "The server returned data in an unexpected format.";
  }
  return error instanceof Error ? error.message : "The request failed.";
}
