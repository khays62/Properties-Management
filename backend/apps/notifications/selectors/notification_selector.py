from django.db.models import Q, QuerySet

from apps.accounts.models import User

from ..models import Notification


class NotificationSelector:
    @staticmethod
    def get_user_notifications(
        *,
        user: User,
        is_read: bool | None = None,
        notification_type: str | None = None,
        search: str | None = None,
    ) -> QuerySet[Notification]:
        queryset = Notification.objects.filter(user=user)
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read)
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(message__icontains=search)
            )
        return queryset

    @classmethod
    def get_recent_notifications(
        cls,
        *,
        user: User,
        limit: int = 10,
    ) -> QuerySet[Notification]:
        return cls.get_user_notifications(user=user)[:limit]

    @staticmethod
    def get_unread_count(*, user: User) -> int:
        return Notification.objects.filter(user=user, is_read=False).count()
