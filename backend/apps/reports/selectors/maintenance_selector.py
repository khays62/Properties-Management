from django.db.models import Count, Q, QuerySet

from apps.accounts.models import User
from apps.maintenance.models import MaintenanceTicket
from common.constants import MaintenanceStatus

from .report_filters import ReportFilters, ReportScope, apply_date_range


class MaintenanceSelector:
    @staticmethod
    def get_tickets(
        *,
        user: User,
        filters: ReportFilters,
    ) -> QuerySet[MaintenanceTicket]:
        queryset = MaintenanceTicket.objects.filter(
            unit__property__in=ReportScope.get_properties(user=user, filters=filters)
        )
        if filters.status:
            queryset = queryset.filter(status=filters.status)
        return apply_date_range(
            queryset,
            field="created_at",
            filters=filters,
            is_datetime=True,
        )

    @classmethod
    def get_status_counts(
        cls,
        *,
        user: User,
        filters: ReportFilters,
    ) -> dict[str, int]:
        return cls.get_tickets(user=user, filters=filters).aggregate(
            open_tickets=Count("id", filter=Q(status=MaintenanceStatus.OPEN)),
            assigned_tickets=Count(
                "id",
                filter=Q(status=MaintenanceStatus.ASSIGNED),
            ),
            in_progress_tickets=Count(
                "id",
                filter=Q(status=MaintenanceStatus.IN_PROGRESS),
            ),
            resolved_tickets=Count(
                "id",
                filter=Q(status=MaintenanceStatus.RESOLVED),
            ),
            closed_tickets=Count("id", filter=Q(status=MaintenanceStatus.CLOSED)),
            cancelled_tickets=Count(
                "id",
                filter=Q(status=MaintenanceStatus.CANCELLED),
            ),
        )
