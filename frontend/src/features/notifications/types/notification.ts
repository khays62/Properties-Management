import { z } from "zod";

export const NOTIFICATION_TYPES = [
  "LEASE",
  "PAYMENT",
  "RENEWAL",
  "MAINTENANCE",
  "SYSTEM",
] as const;

export const notificationSchema = z
  .object({
    id: z.string().uuid(),
    title: z.string(),
    type: z.enum(NOTIFICATION_TYPES),
    is_read: z.boolean(),
    created_at: z.string(),
  })
  .passthrough();

export interface NotificationQueryParams {
  is_read?: boolean;
  type?: NotificationType;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface NotificationCollection {
  results: AppNotification[];
  count: number;
}

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
export type AppNotification = z.infer<typeof notificationSchema>;
