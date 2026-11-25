from datetime import date, timedelta

from django.db.models import Count, Q, QuerySet

from apps.accounts.models import User
from apps.leases.models import Lease
from common.constants import LeaseStatus

from .report_filters import ReportFilters, ReportScope


class LeaseSelector:
    @staticmethod
    def get_leases(*, user: User, filters: ReportFilters) -> QuerySet[Lease]:
        queryset = ReportScope.get_leases(user=user, filters=filters)
        if filters.status:
            queryset = queryset.filter(status=filters.status)
        return queryset

    @classmethod
    def get_status_counts(
        cls,
        *,
        user: User,
        filters: ReportFilters,
    ) -> dict[str, int]:
        counts = cls.get_leases(user=user, filters=filters).aggregate(
            leases_count=Count("id"),
            active_leases=Count(
                "id",
                filter=Q(status=LeaseStatus.ACTIVE),
            ),
            approved_leases=Count(
                "id",
                filter=Q(status=LeaseStatus.APPROVED),
            ),
            expiring_leases=Count(
                "id",
                filter=Q(status=LeaseStatus.EXPIRING),
            ),
            terminated_leases=Count(
                "id",
                filter=Q(status=LeaseStatus.TERMINATED),
            ),
            expired_leases=Count(
                "id",
                filter=Q(status=LeaseStatus.EXPIRED),
            ),
            renewed_leases=Count(
                "id",
                filter=Q(status=LeaseStatus.RENEWED),
            ),
        )
        return counts

    @classmethod
    def get_expiring_count(
        cls,
        *,
        user: User,
        filters: ReportFilters,
        today: date,
        days: int,
    ) -> int:
        return cls.get_leases(user=user, filters=filters).filter(
            status__in=(LeaseStatus.ACTIVE, LeaseStatus.EXPIRING),
            end_date__gte=today,
            end_date__lte=today + timedelta(days=days),
        ).count()
