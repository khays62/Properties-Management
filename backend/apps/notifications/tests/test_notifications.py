from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from common.constants import NotificationType, UserRole

from ..models import Notification
from ..selectors.notification_selector import NotificationSelector
from ..services.notification_service import NotificationService


class NotificationApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email="notifications-user@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        self.other_user = User.objects.create_user(
            email="notifications-other@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        self.client.force_authenticate(self.user)

    def create_notification(self, *, user=None, title="Lease update"):
        return NotificationService.create_notification(
            user=user or self.user,
            title=title,
            message="Your lease status has changed.",
            type=NotificationType.LEASE,
        )

    def test_notification_creation_and_unread_selectors(self):
        notification = self.create_notification()

        self.assertFalse(notification.is_read)
        self.assertEqual(NotificationSelector.get_unread_count(user=self.user), 1)
        self.assertEqual(
            list(
                NotificationSelector.get_recent_notifications(
                    user=self.user
                ).values_list("pk", flat=True)
            ),
            [notification.pk],
        )

    def test_user_can_mark_own_notification_read(self):
        notification = self.create_notification()

        response = self.client.post(
            reverse(
                "notifications:notification-mark-read",
                kwargs={"pk": notification.pk},
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_mark_all_read_only_updates_current_users_notifications(self):
        first = self.create_notification(title="First")
        second = self.create_notification(title="Second")
        other = self.create_notification(
            user=self.other_user,
            title="Another user's notification",
        )

        response = self.client.post(
            reverse("notifications:notification-mark-all-read"),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["updated_count"], 2)
        first.refresh_from_db()
        second.refresh_from_db()
        other.refresh_from_db()
        self.assertTrue(first.is_read)
        self.assertTrue(second.is_read)
        self.assertFalse(other.is_read)

    def test_notification_visibility_is_user_specific(self):
        notification = self.create_notification()
        self.client.force_authenticate(self.other_user)

        list_response = self.client.get(reverse("notifications:notification-list"))
        detail_response = self.client.get(
            reverse(
                "notifications:notification-detail",
                kwargs={"pk": notification.pk},
            )
        )
        mark_read_response = self.client.post(
            reverse(
                "notifications:notification-mark-read",
                kwargs={"pk": notification.pk},
            ),
            {},
            format="json",
        )

        self.assertEqual(list_response.data["count"], 0)
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(mark_read_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertFalse(Notification.objects.get(pk=notification.pk).is_read)
