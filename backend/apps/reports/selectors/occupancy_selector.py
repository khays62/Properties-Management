from django.db.models import Count, Q, QuerySet

from apps.accounts.models import User
from apps.properties.models import Unit
from common.constants import UnitStatus

from .report_filters import ReportFilters, ReportScope


class OccupancySelector:
    @staticmethod
    def get_units(*, user: User, filters: ReportFilters) -> QuerySet[Unit]:
        queryset = Unit.objects.filter(
            is_active=True,
            property__in=ReportScope.get_properties(user=user, filters=filters),
        )
        if filters.status:
            queryset = queryset.filter(status=filters.status)
        return queryset

    @classmethod
    def get_counts(cls, *, user: User, filters: ReportFilters) -> dict[str, int]:
        counts = cls.get_units(user=user, filters=filters).aggregate(
            total_units=Count("id"),
            occupied_units=Count(
                "id",
                filter=Q(status=UnitStatus.OCCUPIED),
            ),
            available_units=Count(
                "id",
                filter=Q(status=UnitStatus.AVAILABLE),
            ),
            listed_units=Count(
                "id",
                filter=Q(status=UnitStatus.LISTED),
            ),
            maintenance_units=Count(
                "id",
                filter=Q(status=UnitStatus.MAINTENANCE),
            ),
            rentable_units=Count(
                "id",
                filter=Q(
                    status__in=(
                        UnitStatus.AVAILABLE,
                        UnitStatus.LISTED,
                        UnitStatus.RESERVED,
                        UnitStatus.OCCUPIED,
                    )
                ),
            ),
        )
        counts["total_properties"] = (
            ReportScope.get_properties(user=user, filters=filters).count()
        )
        return counts
