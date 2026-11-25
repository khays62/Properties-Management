from uuid import UUID

from django.db.models import Count, Q, QuerySet

from apps.accounts.models import User
from common.constants import UnitStatus

from ..models import Unit, UnitImage
from .property_selector import PropertySelector


class UnitSelector:
    @staticmethod
    def get_queryset(user: User) -> QuerySet[Unit]:
        visible_properties = PropertySelector.get_queryset(user)
        return Unit.objects.filter(property__in=visible_properties).select_related(
            "property",
            "property__owner",
        )

    @classmethod
    def get_units(
        cls,
        *,
        user: User,
        property_id: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ) -> QuerySet[Unit]:
        queryset = cls.get_queryset(user)
        if property_id:
            try:
                property_id = UUID(property_id)
            except (TypeError, ValueError):
                return queryset.none()
            queryset = queryset.filter(property_id=property_id)
        if status:
            queryset = queryset.filter(status=status)
        if search:
            queryset = queryset.filter(
                Q(unit_number__icontains=search)
                | Q(description__icontains=search)
                | Q(property__name__icontains=search)
                | Q(property__code__icontains=search)
                | Q(property__city__icontains=search)
            )
        return queryset

    @classmethod
    def get_image_queryset(
        cls,
        *,
        user: User,
        unit_id: str | None = None,
    ) -> QuerySet[UnitImage]:
        queryset = UnitImage.objects.filter(
            unit__in=cls.get_queryset(user)
        ).select_related("unit", "unit__property")
        if unit_id:
            try:
                unit_id = UUID(unit_id)
            except (TypeError, ValueError):
                return queryset.none()
            queryset = queryset.filter(unit_id=unit_id)
        return queryset

    @classmethod
    def get_availability(cls, *, user: User) -> dict[str, int]:
        status_counts = {
            entry["status"]: entry["total"]
            for entry in cls.get_queryset(user)
            .filter(is_active=True)
            .values("status")
            .annotate(total=Count("id"))
        }
        return {
            status.value.lower(): status_counts.get(status.value, 0)
            for status in (
                UnitStatus.AVAILABLE,
                UnitStatus.LISTED,
                UnitStatus.OCCUPIED,
                UnitStatus.RESERVED,
                UnitStatus.MAINTENANCE,
            )
        }
