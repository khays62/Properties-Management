import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchRenewalAlert,
  fetchRenewalAlerts,
  generateRenewalAlerts,
  markRenewalAlertRead,
  resolveRenewalAlert,
} from "../api/renewals.api";
import type { RenewalAlertQueryParams } from "../types/renewal";

export const renewalQueryKeys = {
  all: ["renewals"] as const,
  lists: () => [...renewalQueryKeys.all, "list"] as const,
  list: (params: RenewalAlertQueryParams) =>
    [...renewalQueryKeys.lists(), params] as const,
  details: () => [...renewalQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...renewalQueryKeys.details(), id] as const,
};

function invalidateRenewalAlerts(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: renewalQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: renewalQueryKeys.details() }),
  ]);
}

export function useRenewalAlerts(params: RenewalAlertQueryParams) {
  return useQuery({
    queryKey: renewalQueryKeys.list(params),
    queryFn: () => fetchRenewalAlerts(params),
  });
}

export function useRenewalAlert(id: string) {
  return useQuery({
    queryKey: renewalQueryKeys.detail(id),
    queryFn: () => fetchRenewalAlert(id),
    enabled: id.length > 0,
  });
}

export function useGenerateRenewalAlerts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: generateRenewalAlerts,
    onSuccess: () => invalidateRenewalAlerts(queryClient),
  });
}

export function useMarkRenewalAlertRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markRenewalAlertRead(id),
    onSuccess: () => invalidateRenewalAlerts(queryClient),
  });
}

export function useResolveRenewalAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resolveRenewalAlert(id),
    onSuccess: () => invalidateRenewalAlerts(queryClient),
  });
}
