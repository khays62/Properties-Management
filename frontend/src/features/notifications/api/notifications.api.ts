import { z } from "zod";

import { api } from "../../../services/api";
import { getApiErrorMessage } from "../../../services/apiError";
import {
  notificationSchema,
  type AppNotification,
  type NotificationCollection,
  type NotificationQueryParams,
} from "../types/notification";

interface PaginatedNotificationResponse {
  count: number;
  results: unknown[];
}

function isPaginatedResponse(
  value: unknown,
): value is PaginatedNotificationResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    "count" in value &&
    typeof value.count === "number" &&
    "results" in value &&
    Array.isArray(value.results)
  );
}

export async function fetchNotifications(
  params: NotificationQueryParams = {},
): Promise<NotificationCollection> {
  const response = await api.get<unknown>("notifications/", {
    params: { page_size: 20, ...params },
  });
  const payload = response.data;

  if (Array.isArray(payload)) {
    const results = z.array(notificationSchema).parse(payload);
    return { results, count: results.length };
  }
  if (isPaginatedResponse(payload)) {
    return {
      results: z.array(notificationSchema).parse(payload.results),
      count: payload.count,
    };
  }
  throw new Error("The server returned an invalid notifications response.");
}

export async function markNotificationRead(
  notificationId: string,
): Promise<AppNotification> {
  const response = await api.post<unknown>(
    `notifications/${notificationId}/mark-read/`,
    {},
  );
  return notificationSchema.parse(response.data);
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await api.post<unknown>(
    "notifications/mark-all-read/",
    {},
  );
  return z
    .object({ updated_count: z.number().int().nonnegative() })
    .parse(response.data).updated_count;
}

export function getNotificationErrorMessage(error: unknown): string {
  return getApiErrorMessage(error);
}
