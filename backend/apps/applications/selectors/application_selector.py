from uuid import UUID

from django.db.models import Count, Q, QuerySet
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import ApplicationStatus

from ..models import RentalApplication


class ApplicationSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[RentalApplication]:
        return (
            RentalApplication.objects.filter(
                listing__unit__property__in=PropertySelector.get_queryset(user)
            )
            .select_related(
                "applicant",
                "listing",
                "listing__unit",
                "listing__unit__property",
            )
            .prefetch_related("screening")
        )

    @staticmethod
    def user_can_manage_application(
        user: User,
        application: RentalApplication,
    ) -> bool:
        return PropertySelector.user_can_manage_property(
            user,
            application.listing.unit.property,
        )

    @classmethod
    def get_applications(
        cls,
        *,
        user: User,
        status: str | None = None,
        listing_id: str | None = None,
        city: str | None = None,
        property_id: str | None = None,
        date: str | None = None,
        search: str | None = None,
    ) -> QuerySet[RentalApplication]:
        queryset = cls.get_queryset(user=user)
        if status:
            queryset = queryset.filter(status=status)
        if listing_id:
            try:
                listing_uuid = UUID(listing_id)
            except (TypeError, ValueError):
                return queryset.none()
            queryset = queryset.filter(listing_id=listing_uuid)
        if property_id:
            try:
                property_uuid = UUID(property_id)
            except (TypeError, ValueError):
                return queryset.none()
            queryset = queryset.filter(
                listing__unit__property_id=property_uuid
            )
        if city:
            queryset = queryset.filter(
                listing__unit__property__city__icontains=city
            )
        if date:
            parsed_date = parse_date(date)
            if parsed_date is None:
                raise ValidationError({"date": "Use a valid YYYY-MM-DD date."})
            queryset = queryset.filter(submitted_at__date=parsed_date)
        if search:
            queryset = queryset.filter(
                Q(applicant__first_name__icontains=search)
                | Q(applicant__last_name__icontains=search)
                | Q(applicant__email__icontains=search)
                | Q(listing__title__icontains=search)
                | Q(listing__unit__unit_number__icontains=search)
                | Q(listing__unit__property__name__icontains=search)
                | Q(listing__unit__property__city__icontains=search)
            )
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
            for status in ApplicationStatus
        }
