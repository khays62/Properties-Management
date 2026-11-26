import { z } from "zod";

export const MAINTENANCE_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
] as const;

export const MAINTENANCE_CATEGORIES = [
  "PLUMBING",
  "ELECTRICAL",
  "CLEANING",
  "SECURITY",
  "HVAC",
  "OTHER",
] as const;

export const MAINTENANCE_PRIORITIES = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
] as const;

export const MAINTENANCE_ACTIVITY_ACTIONS = [
  "CREATED",
  "ASSIGNED",
  "STARTED",
  "UPDATED",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
] as const;

const uuidSchema = z.string().uuid();

export const maintenanceAttachmentSchema = z.object({
  id: uuidSchema,
  ticket: uuidSchema,
  file: z.string(),
  uploaded_at: z.string(),
});

export const maintenanceActivitySchema = z.object({
  id: uuidSchema,
  ticket: uuidSchema,
  action: z.enum(MAINTENANCE_ACTIVITY_ACTIONS),
  performed_by: uuidSchema.nullable(),
  notes: z.string(),
  created_at: z.string(),
});

export const maintenanceTicketSchema = z.object({
  id: uuidSchema,
  tenant: uuidSchema,
  unit: uuidSchema,
  title: z.string(),
  description: z.string(),
  category: z.enum(MAINTENANCE_CATEGORIES),
  priority: z.enum(MAINTENANCE_PRIORITIES),
  assigned_to: uuidSchema.nullable(),
  resolution_notes: z.string(),
  status: z.enum(MAINTENANCE_STATUSES),
  created_at: z.string(),
  updated_at: z.string(),
});

export const maintenanceTicketDetailsSchema = maintenanceTicketSchema.extend({
  attachments: z.array(maintenanceAttachmentSchema),
  activities: z.array(maintenanceActivitySchema),
});

export const maintenanceTenantSchema = z.object({
  id: uuidSchema,
  user: uuidSchema,
  emergency_contact_name: z.string(),
  emergency_contact_phone: z.string(),
  occupation: z.string(),
  notes: z.string(),
  status: z.enum(["ACTIVE", "INACTIVE", "MOVED_OUT"]),
  created_at: z.string(),
  updated_at: z.string(),
});

export interface MaintenanceQueryParams {
  status?: MaintenanceStatus;
  priority?: MaintenancePriority;
  category?: MaintenanceCategory;
  tenant?: string;
  property?: string;
  unit?: string;
  assigned_to?: string;
  search?: string;
  page?: number;
}

export interface MaintenanceCollection {
  results: MaintenanceTicket[];
  count: number;
}

export interface MaintenanceCreateInput {
  unit: string;
  tenant?: string;
  title: string;
  description: string;
  category: MaintenanceCategory;
  priority: MaintenancePriority;
}

export interface MaintenanceUpdateInput {
  title?: string;
  description?: string;
  category?: MaintenanceCategory;
  priority?: MaintenancePriority;
}

export interface MaintenanceAssignmentInput {
  assigned_to: string;
  notes?: string;
}

export interface MaintenanceTransitionInput {
  notes?: string;
}

export interface MaintenanceResolveInput {
  resolution_notes: string;
}

export type MaintenanceStatus = (typeof MAINTENANCE_STATUSES)[number];
export type MaintenanceCategory = (typeof MAINTENANCE_CATEGORIES)[number];
export type MaintenancePriority = (typeof MAINTENANCE_PRIORITIES)[number];
export type MaintenanceActivityAction =
  (typeof MAINTENANCE_ACTIVITY_ACTIONS)[number];
export type MaintenanceTicket = z.infer<typeof maintenanceTicketSchema>;
export type MaintenanceTicketDetails = z.infer<
  typeof maintenanceTicketDetailsSchema
>;
export type MaintenanceActivity = z.infer<typeof maintenanceActivitySchema>;
export type MaintenanceAttachment = z.infer<
  typeof maintenanceAttachmentSchema
>;
export type MaintenanceTenant = z.infer<typeof maintenanceTenantSchema>;

export type MaintenanceAction =
  | "assign"
  | "start"
  | "resolve"
  | "close"
  | "cancel";
