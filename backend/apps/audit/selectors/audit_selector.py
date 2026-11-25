from uuid import UUID

from django.db.models import Q, QuerySet
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User

from ..models import AuditLog


class AuditSelector:
    @staticmethod
    def get_logs(
        *,
        action: str | None = None,
        model_name: str | None = None,
        user_id: str | None = None,
        date: str | None = None,
        object_id: str | None = None,
        search: str | None = None,
    ) -> QuerySet[AuditLog]:
        queryset = AuditLog.objects.select_related("user")
        if action:
            queryset = queryset.filter(action=action)
        if model_name:
            queryset = queryset.filter(model_name__iexact=model_name)
        if user_id:
            try:
                parsed_user_id = UUID(user_id)
            except (TypeError, ValueError):
                return queryset.none()
            queryset = queryset.filter(user_id=parsed_user_id)
        if date:
            parsed_date = parse_date(date)
            if parsed_date is None:
                raise ValidationError({"date": "Use a valid YYYY-MM-DD date."})
            queryset = queryset.filter(created_at__date=parsed_date)
        if object_id:
            queryset = queryset.filter(object_id=object_id)
        if search:
            queryset = queryset.filter(
                Q(action__icontains=search)
                | Q(model_name__icontains=search)
                | Q(object_id__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
            )
        return queryset

    @staticmethod
    def get_activity_history(
        *,
        model_name: str,
        object_id: str,
    ) -> QuerySet[AuditLog]:
        return AuditLog.objects.filter(
            model_name__iexact=model_name,
            object_id=object_id,
        ).select_related("user")
