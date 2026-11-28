import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { listingQueryKeys } from "../../listings/hooks/useListings";
import { propertyQueryKeys } from "../../properties/hooks/useProperties";
import { unitQueryKeys } from "../../units/hooks/useUnits";
import {
  createLease,
  fetchLease,
  fetchLeaseApplications,
  fetchLeases,
  fetchLeaseProperties,
  fetchLeaseTenants,
  fetchLeaseUnits,
  renewLease,
  transitionLease,
} from "../api/leases.api";
import type {
  LeaseCreateInput,
  LeaseQueryParams,
  LeaseRenewalInput,
  LeaseTransitionAction,
} from "../types/lease";

export const leaseQueryKeys = {
  all: ["leases"] as const,
  lists: () => [...leaseQueryKeys.all, "list"] as const,
  list: (params: LeaseQueryParams) =>
    [...leaseQueryKeys.lists(), params] as const,
  details: () => [...leaseQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...leaseQueryKeys.details(), id] as const,
  properties: () => [...leaseQueryKeys.all, "property-options"] as const,
  units: () => [...leaseQueryKeys.all, "unit-options"] as const,
  tenants: () => [...leaseQueryKeys.all, "tenant-options"] as const,
  applications: () => [...leaseQueryKeys.all, "application-options"] as const,
};

function invalidateLeaseData(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: leaseQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: leaseQueryKeys.details() }),
    queryClient.invalidateQueries({ queryKey: unitQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: listingQueryKeys.all }),
    queryClient.invalidateQueries({ queryKey: propertyQueryKeys.all }),
  ]);
}

export function useLeases(params: LeaseQueryParams) {
  return useQuery({
    queryKey: leaseQueryKeys.list(params),
    queryFn: () => fetchLeases(params),
  });
}

export function useLease(id: string) {
  return useQuery({
    queryKey: leaseQueryKeys.detail(id),
    queryFn: () => fetchLease(id),
    enabled: id.length > 0,
  });
}

export function useLeasePropertyOptions(enabled = true) {
  return useQuery({
    queryKey: leaseQueryKeys.properties(),
    queryFn: fetchLeaseProperties,
    enabled,
  });
}

export function useLeaseUnitOptions(enabled = true) {
  return useQuery({
    queryKey: leaseQueryKeys.units(),
    queryFn: fetchLeaseUnits,
    enabled,
  });
}

export function useLeaseTenantOptions(enabled = true) {
  return useQuery({
    queryKey: leaseQueryKeys.tenants(),
    queryFn: fetchLeaseTenants,
    enabled,
  });
}

export function useLeaseApplicationOptions(enabled = true) {
  return useQuery({
    queryKey: leaseQueryKeys.applications(),
    queryFn: fetchLeaseApplications,
    enabled,
  });
}

export function useCreateLease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: LeaseCreateInput) => createLease(values),
    onSuccess: () => invalidateLeaseData(queryClient),
  });
}

export function useLeaseTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: LeaseTransitionAction;
    }) => transitionLease(id, action),
    onSuccess: () => invalidateLeaseData(queryClient),
  });
}

export function useLeaseRenewal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      values,
    }: {
      id: string;
      values: LeaseRenewalInput;
    }) => renewLease(id, values),
    onSuccess: () => invalidateLeaseData(queryClient),
  });
}
