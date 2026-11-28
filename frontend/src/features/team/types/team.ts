import { z } from "zod";

export const teamRoleSchema = z.enum(["PROPERTY_MANAGER", "ACCOUNTANT"]);
export type TeamRole = z.infer<typeof teamRoleSchema>;

export const teamMemberStatusSchema = z.enum([
  "ACTIVE",
  "INACTIVE",
  "PENDING",
  "EXPIRED",
]);
export type TeamMemberStatus = z.infer<typeof teamMemberStatusSchema>;

export const teamInvitationStatusSchema = z.enum([
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
]);
export type TeamInvitationStatus = z.infer<
  typeof teamInvitationStatusSchema
>;

export const teamInvitationSummarySchema = z.object({
  id: z.string().uuid(),
  status: teamInvitationStatusSchema,
  expires_at: z.string().nullable(),
  created_at: z.string(),
});
export type TeamInvitationSummary = z.infer<
  typeof teamInvitationSummarySchema
>;

export const teamMemberSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  full_name: z.string(),
  email: z.string().email(),
  role: teamRoleSchema,
  status: teamMemberStatusSchema,
  created_at: z.string(),
  assignment_count: z.number().int().nonnegative(),
  invitation: teamInvitationSummarySchema.nullable(),
});
export type TeamMember = z.infer<typeof teamMemberSchema>;

export const teamMemberAssignmentSchema = z.object({
  property_id: z.string().uuid(),
  property_name: z.string(),
  property_city: z.string(),
  assigned_date: z.string(),
  is_active: z.boolean(),
});
export type TeamMemberAssignment = z.infer<
  typeof teamMemberAssignmentSchema
>;

export const teamMemberDetailsSchema = teamMemberSchema.extend({
  assignments: z.array(teamMemberAssignmentSchema),
});
export type TeamMemberDetails = z.infer<typeof teamMemberDetailsSchema>;

export const teamInvitationSchema = z.object({
  id: z.string().uuid(),
  user: z.string().uuid(),
  email: z.string().email(),
  role: teamRoleSchema,
  invited_by: z.string().uuid(),
  status: teamInvitationStatusSchema,
  expires_at: z.string().nullable(),
  accepted_at: z.string().nullable(),
  created_at: z.string(),
});
export type TeamInvitation = z.infer<typeof teamInvitationSchema>;

export const teamMembersCollectionSchema = z.object({
  count: z.number().int().nonnegative(),
  results: z.array(teamMemberSchema),
});
export type TeamMembersCollection = z.infer<
  typeof teamMembersCollectionSchema
>;

export interface TeamInvitationCreateInput {
  email: string;
  first_name?: string;
  last_name?: string;
  role: TeamRole;
}

export interface TeamMemberQueryParams {
  page?: number;
  page_size?: number;
  role?: TeamRole;
  status?: TeamMemberStatus;
  search?: string;
}
