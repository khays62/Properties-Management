from dataclasses import dataclass
from datetime import date
from uuid import UUID

from django.db.models import QuerySet
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.leases.models import Lease
from apps.properties.models import Property
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import UserRole
from common.permissions import has_role


@dataclass(frozen=True)
class ReportFilters:
    property_id: UUID | None = None
    city: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = None

    @classmethod
    def from_query_params(cls, params) -> "ReportFilters":
        property_value = params.get("property")
        try:
            property_id = UUID(property_value) if property_value else None
        except (TypeError, ValueError) as exc:
            raise ValidationError(
                {"property": "Enter a valid property UUID."}
            ) from exc

        parsed_dates = {}
        for parameter in ("start_date", "end_date"):
            value = params.get(parameter)
            try:
                parsed_date = parse_date(value) if value else None
            except ValueError:
                parsed_date = None
            if value and parsed_date is None:
                raise ValidationError(
                    {parameter: "Use a valid YYYY-MM-DD date."}
                )
            parsed_dates[parameter] = parsed_date

        start_date = parsed_dates["start_date"]
        end_date = parsed_dates["end_date"]
        if start_date and end_date and start_date > end_date:
            raise ValidationError(
                {"end_date": "End date must be on or after start date."}
            )

        return cls(
            property_id=property_id,
            city=params.get("city") or None,
            start_date=start_date,
            end_date=end_date,
            status=params.get("status") or None,
        )


class ReportScope:
    @staticmethod
    def get_properties(*, user: User, filters: ReportFilters) -> QuerySet[Property]:
        if has_role(user, (UserRole.ACCOUNTANT,)):
            queryset = Property.objects.all()
        elif has_role(user, (UserRole.OWNER, UserRole.PROPERTY_MANAGER)):
            queryset = PropertySelector.get_queryset(user)
        else:
            queryset = Property.objects.none()

        if filters.property_id:
            queryset = queryset.filter(pk=filters.property_id)
        if filters.city:
            queryset = queryset.filter(city__icontains=filters.city)
        return queryset

    @classmethod
    def get_leases(cls, *, user: User, filters: ReportFilters) -> QuerySet[Lease]:
        queryset = Lease.objects.select_related(
            "tenant",
            "tenant__user",
            "unit",
            "unit__property",
        )
        if has_role(user, (UserRole.TENANT,)):
            queryset = queryset.filter(tenant__user=user)
        else:
            queryset = queryset.filter(
                unit__property__in=cls.get_properties(user=user, filters=filters)
            )
        if filters.start_date:
            queryset = queryset.filter(end_date__gte=filters.start_date)
        if filters.end_date:
            queryset = queryset.filter(start_date__lte=filters.end_date)
        return queryset

def apply_date_range(
    queryset: QuerySet,
    *,
    field: str,
    filters: ReportFilters,
    is_datetime: bool = False,
) -> QuerySet:
    lookup_root = f"{field}__date" if is_datetime else field
    if filters.start_date:
        queryset = queryset.filter(**{f"{lookup_root}__gte": filters.start_date})
    if filters.end_date:
        queryset = queryset.filter(**{f"{lookup_root}__lte": filters.end_date})
    return queryset
