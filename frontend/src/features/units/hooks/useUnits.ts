import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { propertyQueryKeys } from "../../properties/hooks/useProperties";
import {
  archiveUnit,
  createUnit,
  fetchUnit,
  fetchUnits,
  updateUnit,
} from "../api/units.api";
import type { UnitInput, UnitQueryParams } from "../types/unit";

export const unitQueryKeys = {
  all: ["units"] as const,
  lists: () => [...unitQueryKeys.all, "list"] as const,
  list: (params: UnitQueryParams) =>
    [...unitQueryKeys.lists(), params] as const,
  details: () => [...unitQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...unitQueryKeys.details(), id] as const,
};

function invalidateUnitData(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: unitQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: unitQueryKeys.details() }),
    queryClient.invalidateQueries({ queryKey: propertyQueryKeys.all }),
  ]);
}

export function useUnits(params: UnitQueryParams) {
  return useQuery({
    queryKey: unitQueryKeys.list(params),
    queryFn: () => fetchUnits(params),
  });
}

export function useUnit(id: string) {
  return useQuery({
    queryKey: unitQueryKeys.detail(id),
    queryFn: () => fetchUnit(id),
    enabled: id.length > 0,
  });
}

export function useCreateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: UnitInput) => createUnit(values),
    onSuccess: () => invalidateUnitData(queryClient),
  });
}

export function useUpdateUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: UnitInput }) =>
      updateUnit(id, values),
    onSuccess: () => invalidateUnitData(queryClient),
  });
}

export function useArchiveUnit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveUnit(id),
    onSuccess: () => invalidateUnitData(queryClient),
  });
}
