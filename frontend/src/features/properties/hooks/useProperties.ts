import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  archiveProperty,
  assignPropertyManager,
  createProperty,
  fetchProperties,
  fetchProperty,
  updateProperty,
} from "../api/properties.api";
import type {
  PropertyInput,
  PropertyQueryParams,
} from "../types/property";

export const propertyQueryKeys = {
  all: ["properties"] as const,
  lists: () => [...propertyQueryKeys.all, "list"] as const,
  list: (params: PropertyQueryParams) =>
    [...propertyQueryKeys.lists(), params] as const,
  details: () => [...propertyQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...propertyQueryKeys.details(), id] as const,
};

function invalidateProperties(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: propertyQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: propertyQueryKeys.details() }),
  ]);
}

export function useProperties(params: PropertyQueryParams) {
  return useQuery({
    queryKey: propertyQueryKeys.list(params),
    queryFn: () => fetchProperties(params),
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: propertyQueryKeys.detail(id),
    queryFn: () => fetchProperty(id),
    enabled: id.length > 0,
  });
}

export function useCreateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: PropertyInput) => createProperty(values),
    onSuccess: () => invalidateProperties(queryClient),
  });
}

export function useUpdateProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, values }: { id: string; values: PropertyInput }) =>
      updateProperty(id, values),
    onSuccess: (property) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: propertyQueryKeys.detail(property.id),
        }),
      ]),
  });
}

export function useArchiveProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => archiveProperty(id),
    onSuccess: (property) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: propertyQueryKeys.detail(property.id),
        }),
      ]),
  });
}

export function useAssignPropertyManager() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      propertyId,
      managerEmail,
    }: {
      propertyId: string;
      managerEmail: string;
    }) => assignPropertyManager(propertyId, managerEmail),
    onSuccess: (_, variables) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: propertyQueryKeys.lists() }),
        queryClient.invalidateQueries({
          queryKey: propertyQueryKeys.detail(variables.propertyId),
        }),
      ]),
  });
}
