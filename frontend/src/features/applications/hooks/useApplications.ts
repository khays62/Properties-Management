import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchAllApplicationListings,
  fetchApplication,
  fetchApplications,
  rejectApplication,
  transitionApplication,
  transitionScreening,
} from "../api/applications.api";
import type {
  ApplicationQueryParams,
  ApplicationTransitionAction,
  ScreeningAction,
  ScreeningResultInput,
} from "../types/application";

export const applicationQueryKeys = {
  all: ["applications"] as const,
  lists: () => [...applicationQueryKeys.all, "list"] as const,
  list: (params: ApplicationQueryParams) =>
    [...applicationQueryKeys.lists(), params] as const,
  details: () => [...applicationQueryKeys.all, "detail"] as const,
  detail: (id: string) => [...applicationQueryKeys.details(), id] as const,
  listingOptions: () =>
    [...applicationQueryKeys.all, "listing-options"] as const,
};

function invalidateApplications(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: applicationQueryKeys.lists(),
    }),
    queryClient.invalidateQueries({
      queryKey: applicationQueryKeys.details(),
    }),
  ]);
}

export function useApplications(params: ApplicationQueryParams) {
  return useQuery({
    queryKey: applicationQueryKeys.list(params),
    queryFn: () => fetchApplications(params),
  });
}

export function useApplication(id: string) {
  return useQuery({
    queryKey: applicationQueryKeys.detail(id),
    queryFn: () => fetchApplication(id),
    enabled: id.length > 0,
  });
}

export function useApplicationListings() {
  return useQuery({
    queryKey: applicationQueryKeys.listingOptions(),
    queryFn: fetchAllApplicationListings,
  });
}

export function useApplicationTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: ApplicationTransitionAction;
    }) => transitionApplication(id, action),
    onSuccess: () => invalidateApplications(queryClient),
  });
}

export function useRejectApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      rejectionReason,
    }: {
      id: string;
      rejectionReason: string;
    }) => rejectApplication(id, rejectionReason),
    onSuccess: () => invalidateApplications(queryClient),
  });
}

export function useScreeningTransition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      result,
    }: {
      id: string;
      applicationId: string;
      action: ScreeningAction;
      result?: ScreeningResultInput;
    }) => transitionScreening(id, action, result),
    onSuccess: (_, variables) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: applicationQueryKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: applicationQueryKeys.detail(variables.applicationId),
        }),
      ]),
  });
}
