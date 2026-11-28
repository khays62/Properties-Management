import { api } from "../../../services/api";
import {
  teamInvitationSchema,
  teamMemberDetailsSchema,
  teamMembersCollectionSchema,
  type TeamInvitation,
  type TeamInvitationCreateInput,
  type TeamMemberDetails,
  type TeamMemberQueryParams,
  type TeamMembersCollection,
} from "../types/team";

export async function fetchTeamMembers(
  params: TeamMemberQueryParams = {},
): Promise<TeamMembersCollection> {
  const response = await api.get<unknown>("team/", { params });
  return teamMembersCollectionSchema.parse(response.data);
}

export async function fetchTeamMember(
  memberId: string,
): Promise<TeamMemberDetails> {
  const response = await api.get<unknown>(`team/${memberId}/`);
  return teamMemberDetailsSchema.parse(response.data);
}

export async function createTeamInvitation(
  values: TeamInvitationCreateInput,
): Promise<TeamInvitation> {
  const response = await api.post<unknown>("team/invitations/", values);
  return teamInvitationSchema.parse(response.data);
}

export async function resendTeamInvitation(
  invitationId: string,
): Promise<TeamInvitation> {
  const response = await api.post<unknown>(
    `team/invitations/${invitationId}/resend/`,
    {},
  );
  return teamInvitationSchema.parse(response.data);
}

export async function revokeTeamInvitation(
  invitationId: string,
): Promise<TeamInvitation> {
  const response = await api.post<unknown>(
    `team/invitations/${invitationId}/revoke/`,
    {},
  );
  return teamInvitationSchema.parse(response.data);
}

export async function deactivateTeamMember(
  memberId: string,
): Promise<TeamMemberDetails> {
  const response = await api.post<unknown>(
    `team/${memberId}/deactivate/`,
    {},
  );
  return teamMemberDetailsSchema.parse(response.data);
}

export async function reactivateTeamMember(
  memberId: string,
): Promise<TeamMemberDetails> {
  const response = await api.post<unknown>(
    `team/${memberId}/reactivate/`,
    {},
  );
  return teamMemberDetailsSchema.parse(response.data);
}

export async function acceptTeamInvitation(values: {
  invitation: string;
  token: string;
  new_password: string;
}): Promise<TeamInvitation> {
  const response = await api.post<unknown>(
    "team/invitations/accept/",
    values,
  );
  return teamInvitationSchema.parse(response.data);
}
