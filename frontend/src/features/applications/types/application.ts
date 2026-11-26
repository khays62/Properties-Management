import { z } from "zod";

export const APPLICATION_STATUSES = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "SCREENING",
  "APPROVED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export const SCREENING_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "PASSED",
  "FAILED",
  "NEEDS_REVIEW",
] as const;

export const EMPLOYMENT_STATUSES = [
  "EMPLOYED",
  "SELF_EMPLOYED",
  "UNEMPLOYED",
  "STUDENT",
] as const;

export const applicantSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  employment_status: z.enum(EMPLOYMENT_STATUSES),
  employer_name: z.string(),
  monthly_income: z.union([z.string(), z.number()]),
  current_address: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const screeningSchema = z.object({
  id: z.string().uuid(),
  application: z.string().uuid(),
  score: z.number().int().min(0).max(100).nullable(),
  notes: z.string(),
  income_verified: z.boolean(),
  employment_verified: z.boolean(),
  references_checked: z.boolean(),
  status: z.enum(SCREENING_STATUSES),
  reviewed_by: z.string().uuid().nullable(),
  reviewed_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const applicationSchema = z.object({
  id: z.string().uuid(),
  listing: z.string().uuid(),
  applicant: applicantSchema,
  move_in_date: z.string(),
  notes: z.string(),
  rejection_reason: z.string(),
  status: z.enum(APPLICATION_STATUSES),
  submitted_at: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const applicationDetailsSchema = applicationSchema.extend({
  screening: screeningSchema.nullable().optional(),
});

export interface ApplicationQueryParams {
  status?: ApplicationStatus;
  listing?: string;
  property?: string;
  city?: string;
  date?: string;
  search?: string;
  page?: number;
}

export interface ApplicationCollection {
  results: Application[];
  count: number;
}

export type Applicant = z.infer<typeof applicantSchema>;
export type Screening = z.infer<typeof screeningSchema>;
export type Application = z.infer<typeof applicationSchema>;
export type ApplicationDetails = z.infer<typeof applicationDetailsSchema>;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export type ScreeningStatus = (typeof SCREENING_STATUSES)[number];
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number];
export type ApplicationAction =
  | "review"
  | "start-screening"
  | "approve"
  | "reject"
  | "withdraw";
export type ApplicationTransitionAction = Exclude<
  ApplicationAction,
  "reject"
>;
export type ScreeningAction = "start" | "pass" | "fail";

export interface ScreeningResultInput {
  score?: number;
  notes?: string;
  income_verified?: boolean;
  employment_verified?: boolean;
  references_checked?: boolean;
}
