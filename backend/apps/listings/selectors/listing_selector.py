from uuid import UUID

from django.db.models import Q, QuerySet
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import ListingStatus, PropertyStatus

from ..models import Listing, ListingImage


class ListingSelector:
    @staticmethod
    def get_queryset(*, user: User | None = None, public: bool = False) -> QuerySet[Listing]:
        queryset = Listing.objects.select_related(
            "unit",
            "unit__property",
            "unit__property__owner",
        ).prefetch_related("images")
        if public:
            return queryset.filter(
                status=ListingStatus.PUBLISHED,
                unit__property__status__in=[
                    value
                    for value, _ in PropertyStatus.choices
                    if value != PropertyStatus.ARCHIVED
                ],
            )
        if user is None:
            return queryset.none()
        return queryset.filter(
            unit__property__in=PropertySelector.get_queryset(user)
        )

    @staticmethod
    def user_can_manage_listing(user: User, listing: Listing) -> bool:
        return PropertySelector.user_can_manage_property(user, listing.unit.property)

    @classmethod
    def get_listings(
        cls,
        *,
        user: User | None = None,
        public: bool = False,
        status: str | None = None,
        property_id: str | None = None,
        city: str | None = None,
        available_date: str | None = None,
        search: str | None = None,
    ) -> QuerySet[Listing]:
        queryset = cls.get_queryset(user=user, public=public)
        if status:
            queryset = queryset.filter(status=status)
        if property_id:
            try:
                property_id = UUID(property_id)
            except (TypeError, ValueError):
                return queryset.none()
            queryset = queryset.filter(unit__property_id=property_id)
        if city:
            queryset = queryset.filter(unit__property__city__icontains=city)
        if available_date:
            parsed_date = parse_date(available_date)
            if parsed_date is None:
                raise ValidationError(
                    {"available_date": "Use a valid YYYY-MM-DD date."}
                )
            queryset = queryset.filter(available_date=parsed_date)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(unit__unit_number__icontains=search)
                | Q(unit__property__name__icontains=search)
                | Q(unit__property__city__icontains=search)
            )
        return queryset

    @classmethod
    def get_image_queryset(
        cls,
        *,
        user: User,
        public: bool = False,
    ) -> QuerySet[ListingImage]:
        return ListingImage.objects.filter(
            listing__in=cls.get_queryset(user=user, public=public)
        ).select_related("listing", "listing__unit", "listing__unit__property")
