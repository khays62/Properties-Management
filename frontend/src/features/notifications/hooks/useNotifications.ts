import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { toastService } from "../../../services/toastService";
import {
  fetchNotifications,
  getNotificationErrorMessage,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications.api";
import type { NotificationQueryParams } from "../types/notification";

export const notificationQueryKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationQueryKeys.all, "list"] as const,
  list: (params: NotificationQueryParams) =>
    [...notificationQueryKeys.lists(), params] as const,
};

function invalidateNotificationLists(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return queryClient.invalidateQueries({
    queryKey: notificationQueryKeys.lists(),
  });
}

export function useNotifications(params: NotificationQueryParams = {}) {
  return useQuery({
    queryKey: notificationQueryKeys.list(params),
    queryFn: () => fetchNotifications(params),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationQueryKeys.list({
      is_read: false,
      page: 1,
      page_size: 1,
    }),
    queryFn: () =>
      fetchNotifications({ is_read: false, page: 1, page_size: 1 }),
    select: (notifications) => notifications.count,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => invalidateNotificationLists(queryClient),
    onError: (error) =>
      toastService.error(getNotificationErrorMessage(error)),
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => invalidateNotificationLists(queryClient),
    onError: (error) =>
      toastService.error(getNotificationErrorMessage(error)),
  });
}
