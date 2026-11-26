import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import type {
  MaintenanceAssignmentInput,
  MaintenanceCreateInput,
  MaintenanceQueryParams,
  MaintenanceResolveInput,
  MaintenanceTransitionInput,
  MaintenanceUpdateInput,
} from "../types/maintenance";
import {
  assignMaintenanceTicket,
  cancelMaintenanceTicket,
  closeMaintenanceTicket,
  createMaintenanceTicket,
  fetchMaintenanceActivities,
  fetchMaintenanceLeases,
  fetchMaintenanceProperties,
  fetchMaintenanceTenants,
  fetchMaintenanceTicket,
  fetchMaintenanceTickets,
  fetchMaintenanceUnits,
  resolveMaintenanceTicket,
  startMaintenanceTicket,
  updateMaintenanceTicket,
  uploadMaintenanceAttachment,
} from "../api/maintenance.api";

export const maintenanceQueryKeys = {
  all: ["maintenance"] as const,
  lists: () => [...maintenanceQueryKeys.all, "list"] as const,
  list: (params: MaintenanceQueryParams) =>
    [...maintenanceQueryKeys.lists(), params] as const,
  details: () => [...maintenanceQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...maintenanceQueryKeys.details(), id] as const,
  activities: (ticketId: string) =>
    [...maintenanceQueryKeys.all, "activities", ticketId] as const,
  units: () => [...maintenanceQueryKeys.all, "unit-options"] as const,
  properties: () => [...maintenanceQueryKeys.all, "property-options"] as const,
  tenants: () => [...maintenanceQueryKeys.all, "tenant-options"] as const,
  leases: () => [...maintenanceQueryKeys.all, "lease-options"] as const,
};

function invalidateTickets(
  client: ReturnType<typeof useQueryClient>,
  ticketId?: string,
) {
  return Promise.all([
    client.invalidateQueries({ queryKey: maintenanceQueryKeys.lists() }),
    client.invalidateQueries({ queryKey: maintenanceQueryKeys.details() }),
    ...(ticketId
      ? [
          client.invalidateQueries({
            queryKey: maintenanceQueryKeys.activities(ticketId),
          }),
        ]
      : []),
  ]);
}

export function useMaintenanceTickets(params: MaintenanceQueryParams) {
  return useQuery({
    queryKey: maintenanceQueryKeys.list(params),
    queryFn: () => fetchMaintenanceTickets(params),
  });
}

export function useMaintenanceTicket(id: string) {
  return useQuery({
    queryKey: maintenanceQueryKeys.detail(id),
    queryFn: () => fetchMaintenanceTicket(id),
    enabled: id.length > 0,
  });
}

export function useMaintenanceActivities(ticketId: string) {
  return useQuery({
    queryKey: maintenanceQueryKeys.activities(ticketId),
    queryFn: () => fetchMaintenanceActivities(ticketId),
    enabled: ticketId.length > 0,
  });
}

export function useMaintenanceUnits(enabled = true) {
  return useQuery({
    queryKey: maintenanceQueryKeys.units(),
    queryFn: fetchMaintenanceUnits,
    enabled,
  });
}

export function useMaintenanceProperties(enabled = true) {
  return useQuery({
    queryKey: maintenanceQueryKeys.properties(),
    queryFn: fetchMaintenanceProperties,
    enabled,
  });
}

export function useMaintenanceTenants(enabled = true) {
  return useQuery({
    queryKey: maintenanceQueryKeys.tenants(),
    queryFn: fetchMaintenanceTenants,
    enabled,
  });
}

export function useMaintenanceLeases(enabled = true) {
  return useQuery({
    queryKey: maintenanceQueryKeys.leases(),
    queryFn: fetchMaintenanceLeases,
    enabled,
  });
}

export function useCreateMaintenanceTicket() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values: MaintenanceCreateInput) =>
      createMaintenanceTicket(values),
    onSuccess: () => invalidateTickets(client),
  });
}

export function useUpdateMaintenanceTicket() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: MaintenanceUpdateInput;
    }) => updateMaintenanceTicket(id, values),
    onSuccess: (ticket) => invalidateTickets(client, ticket.id),
  });
}

export function useAssignMaintenanceTicket() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: MaintenanceAssignmentInput;
    }) => assignMaintenanceTicket(id, values),
    onSuccess: (ticket) => invalidateTickets(client, ticket.id),
  });
}

export function useStartMaintenanceTicket() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: MaintenanceTransitionInput;
    }) => startMaintenanceTicket(id, values),
    onSuccess: (ticket) => invalidateTickets(client, ticket.id),
  });
}

export function useResolveMaintenanceTicket() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: MaintenanceResolveInput;
    }) => resolveMaintenanceTicket(id, values),
    onSuccess: (ticket) => invalidateTickets(client, ticket.id),
  });
}

export function useCloseMaintenanceTicket() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: MaintenanceTransitionInput;
    }) => closeMaintenanceTicket(id, values),
    onSuccess: (ticket) => invalidateTickets(client, ticket.id),
  });
}

export function useCancelMaintenanceTicket() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: MaintenanceTransitionInput;
    }) => cancelMaintenanceTicket(id, values),
    onSuccess: (ticket) => invalidateTickets(client, ticket.id),
  });
}

export function useUploadMaintenanceAttachment() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, file }: { ticketId: string; file: File }) =>
      uploadMaintenanceAttachment(ticketId, file),
    onSuccess: (_, variables) => invalidateTickets(client, variables.ticketId),
  });
}
