import { z } from "zod";

export const LEASE_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "ACTIVE",
  "EXPIRING",
  "RENEWED",
  "TERMINATED",
  "EXPIRED",
] as const;

export const TENANT_STATUSES = ["ACTIVE", "INACTIVE", "MOVED_OUT"] as const;

const amountSchema = z.union([z.string(), z.number()]);

export const leaseStatusHistorySchema = z.object({
  id: z.string().uuid(),
  old_status: z.union([z.literal(""), z.enum(LEASE_STATUSES)]),
  new_status: z.enum(LEASE_STATUSES),
  changed_by: z.string().uuid().nullable(),
  changed_by_name: z.string().nullable().optional(),
  change_reason: z.string(),
  created_at: z.string(),
});

export const leaseSchema = z.object({
  id: z.string().uuid(),
  tenant: z.string().uuid(),
  tenant_name: z.string().optional(),
  tenant_email: z.string().email().optional(),
  lease_label: z.string().optional(),
  unit: z.string().uuid(),
  unit_number: z.string().optional(),
  unit_status: z.string().optional(),
  property_name: z.string().optional(),
  property_code: z.string().optional(),
  application: z.string().uuid(),
  application_name: z.string().optional(),
  application_listing_title: z.string().optional(),
  start_date: z.string(),
  end_date: z.string(),
  monthly_rent: amountSchema,
  deposit_amount: amountSchema,
  payment_due_day: z.number().int().min(1).max(31),
  status: z.enum(LEASE_STATUSES),
  approved_by: z.string().uuid().nullable(),
  approved_by_name: z.string().nullable().optional(),
  approved_at: z.string().nullable(),
  notes: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const leaseDetailsSchema = leaseSchema.extend({
  status_history: z.array(leaseStatusHistorySchema),
});

export const tenantSchema = z.object({
  id: z.string().uuid(),
  user: z.string().uuid(),
  user_name: z.string().optional(),
  user_email: z.string().email().optional(),
  emergency_contact_name: z.string(),
  emergency_contact_phone: z.string(),
  occupation: z.string(),
  notes: z.string(),
  status: z.enum(TENANT_STATUSES),
  created_at: z.string(),
  updated_at: z.string(),
});

export interface LeaseQueryParams {
  status?: LeaseStatus;
  tenant?: string;
  property?: string;
  unit?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
}

export interface LeaseCollection {
  results: LeaseDetails[];
  count: number;
}

export interface LeaseCreateInput {
  application: string;
  start_date: string;
  end_date: string;
  monthly_rent: string;
  deposit_amount: string;
  payment_due_day: number;
  notes: string;
}

export interface LeaseRenewalInput {
  new_end_date: string;
}

export type LeaseStatus = (typeof LEASE_STATUSES)[number];
export type TenantStatus = (typeof TENANT_STATUSES)[number];
export type LeaseStatusHistory = z.infer<typeof leaseStatusHistorySchema>;
export type Lease = z.infer<typeof leaseSchema>;
export type LeaseDetails = z.infer<typeof leaseDetailsSchema>;
export type Tenant = z.infer<typeof tenantSchema>;
export type LeaseAction =
  | "submit-for-approval"
  | "approve"
  | "activate"
  | "renew"
  | "terminate"
  | "expire";
export type LeaseTransitionAction = Exclude<LeaseAction, "renew">;
