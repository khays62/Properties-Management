import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  acceptTeamInvitation,
  createTeamInvitation,
  deactivateTeamMember,
  fetchTeamMember,
  fetchTeamMembers,
  reactivateTeamMember,
  resendTeamInvitation,
  revokeTeamInvitation,
} from "../api/team.api";
import type {
  TeamInvitationCreateInput,
  TeamMemberQueryParams,
} from "../types/team";

export const teamQueryKeys = {
  members: ["team", "members"] as const,
  member: (memberId: string) => ["team", "member", memberId] as const,
};

function invalidateTeamQueries(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: teamQueryKeys.members }),
    queryClient.invalidateQueries({ queryKey: ["team", "member"] }),
  ]);
}

export function useTeamMembers(params: TeamMemberQueryParams) {
  return useQuery({
    queryKey: [...teamQueryKeys.members, params],
    queryFn: () => fetchTeamMembers(params),
  });
}

export function useTeamMember(memberId: string) {
  return useQuery({
    queryKey: teamQueryKeys.member(memberId),
    queryFn: () => fetchTeamMember(memberId),
    enabled: memberId.length > 0,
  });
}

export function useCreateTeamInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: TeamInvitationCreateInput) =>
      createTeamInvitation(values),
    onSuccess: () => invalidateTeamQueries(queryClient),
  });
}

export function useResendTeamInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      resendTeamInvitation(invitationId),
    onSuccess: () => invalidateTeamQueries(queryClient),
  });
}

export function useRevokeTeamInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      revokeTeamInvitation(invitationId),
    onSuccess: () => invalidateTeamQueries(queryClient),
  });
}

export function useDeactivateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => deactivateTeamMember(memberId),
    onSuccess: () => invalidateTeamQueries(queryClient),
  });
}

export function useReactivateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => reactivateTeamMember(memberId),
    onSuccess: () => invalidateTeamQueries(queryClient),
  });
}

export function useAcceptTeamInvitation() {
  return useMutation({
    mutationFn: acceptTeamInvitation,
  });
}
