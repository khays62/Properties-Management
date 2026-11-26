import { z } from "zod";

export const RENEWAL_ALERT_STATUSES = [
  "UNREAD",
  "READ",
  "RESOLVED",
] as const;

export const renewalAlertSchema = z.object({
  id: z.string().uuid(),
  lease: z.string().uuid(),
  alert_date: z.string(),
  days_before_expiry: z.union([z.literal(90), z.literal(60), z.literal(30)]),
  status: z.enum(RENEWAL_ALERT_STATUSES),
  created_at: z.string(),
  updated_at: z.string(),
});

export interface RenewalAlertQueryParams {
  status?: RenewalAlertStatus;
  lease?: string;
  property?: string;
  page?: number;
  page_size?: number;
}

export interface RenewalAlertCollection {
  results: RenewalAlert[];
  count: number;
}

export type RenewalAlertStatus = (typeof RENEWAL_ALERT_STATUSES)[number];
export type RenewalAlert = z.infer<typeof renewalAlertSchema>;
export type RenewalAlertAction = "mark-read" | "resolve";
