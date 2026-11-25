from django.db import transaction
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import User

from ..models import Notification


class NotificationService:
    @staticmethod
    def create_notification(
        *,
        user: User,
        title: str,
        message: str,
        type: str,
    ) -> Notification:
        notification = Notification(
            user=user,
            title=title,
            message=message,
            type=type,
        )
        notification.full_clean()
        notification.save()
        return notification

    @staticmethod
    def mark_read(
        notification: Notification,
        *,
        user: User,
    ) -> Notification:
        with transaction.atomic():
            try:
                locked_notification = Notification.objects.select_for_update().get(
                    pk=notification.pk,
                    user=user,
                )
            except Notification.DoesNotExist as exc:
                raise PermissionDenied(
                    "You can only mark your own notifications as read."
                ) from exc
            if not locked_notification.is_read:
                locked_notification.is_read = True
                locked_notification.save(update_fields=["is_read", "updated_at"])
        return locked_notification

    @staticmethod
    def mark_all_read(*, user: User) -> int:
        with transaction.atomic():
            updated_count = Notification.objects.filter(
                user=user,
                is_read=False,
            ).update(is_read=True)
        return updated_count
