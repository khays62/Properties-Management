from django.db.models import Count, Q, QuerySet

from apps.accounts.models import User
from apps.properties.selectors.property_selector import PropertySelector

from ..models import Applicant


class ApplicantSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[Applicant]:
        return (
            Applicant.objects.filter(
                applications__listing__unit__property__in=PropertySelector.get_queryset(
                    user
                )
            )
            .distinct()
            .order_by("last_name", "first_name")
        )

    @classmethod
    def get_applicants(
        cls,
        *,
        user: User,
        search: str | None = None,
    ) -> QuerySet[Applicant]:
        queryset = cls.get_queryset(user=user)
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )
        return queryset

    @classmethod
    def get_employment_counts(cls, *, user: User) -> dict[str, int]:
        return {
            entry["employment_status"]: entry["total"]
            for entry in cls.get_queryset(user=user)
            .values("employment_status")
            .annotate(total=Count("id"))
        }
