import { z } from "zod";

import { api } from "../../../services/api";
import { getApiErrorMessage } from "../../../services/apiError";
import {
  unitDetailsSchema,
  unitSchema,
  type Unit,
  type UnitCollection,
  type UnitInput,
  type UnitQueryParams,
  type UnitDetails,
} from "../types/unit";

interface PaginatedUnitResponse {
  count: number;
  results: unknown[];
}

function isPaginatedResponse(value: unknown): value is PaginatedUnitResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

export async function fetchUnits(
  params: UnitQueryParams = {},
): Promise<UnitCollection> {
  const response = await api.get<unknown>("units/", {
    params: { page_size: 20, ...params },
  });
  const payload = response.data;

  if (Array.isArray(payload)) {
    const results = z.array(unitSchema).parse(payload);
    return { results, count: results.length };
  }
  if (isPaginatedResponse(payload)) {
    return {
      results: z.array(unitSchema).parse(payload.results),
      count: payload.count,
    };
  }
  throw new Error("The server returned an invalid units response.");
}

export async function fetchUnit(id: string): Promise<UnitDetails> {
  const response = await api.get<unknown>(`units/${id}/`);
  return unitDetailsSchema.parse(response.data);
}

export async function createUnit(values: UnitInput): Promise<Unit> {
  const response = await api.post<unknown>("units/", values);
  return unitSchema.parse(response.data);
}

export async function updateUnit(
  id: string,
  values: UnitInput,
): Promise<Unit> {
  const response = await api.patch<unknown>(`units/${id}/`, values);
  return unitSchema.parse(response.data);
}

export async function archiveUnit(id: string): Promise<Unit> {
  const response = await api.patch<unknown>(`units/${id}/`, {
    is_active: false,
  });
  return unitSchema.parse(response.data);
}

export { getApiErrorMessage as getUnitErrorMessage };
