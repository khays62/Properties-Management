from uuid import UUID

from django.db.models import Count, QuerySet

from apps.accounts.models import User
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import ScreeningStatus

from ..models import Screening


class ScreeningSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[Screening]:
        return (
            Screening.objects.filter(
                application__listing__unit__property__in=PropertySelector.get_queryset(
                    user
                )
            )
            .select_related(
                "application",
                "application__applicant",
                "application__listing",
                "application__listing__unit",
                "application__listing__unit__property",
                "reviewed_by",
            )
        )

    @classmethod
    def get_screenings(
        cls,
        *,
        user: User,
        status: str | None = None,
        reviewed_by: str | None = None,
    ) -> QuerySet[Screening]:
        queryset = cls.get_queryset(user=user)
        if status:
            queryset = queryset.filter(status=status)
        if reviewed_by:
            try:
                reviewer_uuid = UUID(reviewed_by)
            except (TypeError, ValueError):
                return queryset.none()
            queryset = queryset.filter(reviewed_by_id=reviewer_uuid)
        return queryset

    @classmethod
    def get_status_counts(cls, *, user: User) -> dict[str, int]:
        counts = {
            entry["status"]: entry["total"]
            for entry in cls.get_queryset(user=user)
            .values("status")
            .annotate(total=Count("id"))
        }
        return {
            status.value.lower(): counts.get(status.value, 0)
            for status in ScreeningStatus
        }
