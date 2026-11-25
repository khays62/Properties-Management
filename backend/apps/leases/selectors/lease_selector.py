from datetime import date, timedelta
from uuid import UUID

from django.db.models import Count, Q, QuerySet
from django.utils.dateparse import parse_date
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import LeaseStatus, UserRole
from common.permissions import has_role

from ..models import ACTIVE_LEASE_STATUSES, Lease, Tenant


OCCUPANCY_LEASE_STATUSES = (LeaseStatus.ACTIVE, LeaseStatus.EXPIRING)


class LeaseSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[Lease]:
        queryset = Lease.objects.select_related(
            "tenant",
            "tenant__user",
            "unit",
            "unit__property",
            "application",
            "application__applicant",
        ).prefetch_related("status_history")
        if has_role(user, (UserRole.OWNER, UserRole.PROPERTY_MANAGER)):
            return queryset.filter(
                unit__property__in=PropertySelector.get_queryset(user)
            )
        if Tenant.objects.filter(user=user).exists():
            return queryset.filter(tenant__user=user)
        return queryset.none()

    @staticmethod
    def has_overlapping_active_lease(
        *,
        unit_id,
        start_date: date,
        end_date: date,
        exclude_lease_id=None,
    ) -> bool:
        queryset = Lease.objects.filter(
            unit_id=unit_id,
            status__in=ACTIVE_LEASE_STATUSES,
            start_date__lte=end_date,
            end_date__gte=start_date,
        )
        if exclude_lease_id is not None:
            queryset = queryset.exclude(pk=exclude_lease_id)
        return queryset.exists()

    @classmethod
    def get_leases(
        cls,
        *,
        user: User,
        status: str | None = None,
        tenant_id: str | None = None,
        property_id: str | None = None,
        unit_id: str | None = None,
        start_date: str | None = None,
        end_date: str | None = None,
        search: str | None = None,
    ) -> QuerySet[Lease]:
        queryset = cls.get_queryset(user=user)
        if status:
            queryset = queryset.filter(status=status)
        for value, lookup in (
            (tenant_id, "tenant_id"),
            (property_id, "unit__property_id"),
            (unit_id, "unit_id"),
        ):
            if value:
                try:
                    object_id = UUID(value)
                except (TypeError, ValueError):
                    return queryset.none()
                queryset = queryset.filter(**{lookup: object_id})
        for value, lookup in (
            (start_date, "start_date"),
            (end_date, "end_date"),
        ):
            if value:
                parsed_date = parse_date(value)
                if parsed_date is None:
                    raise ValidationError(
                        {lookup: "Use a valid YYYY-MM-DD date."}
                    )
                queryset = queryset.filter(**{lookup: parsed_date})
        if search:
            queryset = queryset.filter(
                Q(tenant__user__first_name__icontains=search)
                | Q(tenant__user__last_name__icontains=search)
                | Q(tenant__user__email__icontains=search)
                | Q(unit__unit_number__icontains=search)
                | Q(unit__property__name__icontains=search)
                | Q(unit__property__code__icontains=search)
                | Q(unit__property__city__icontains=search)
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
            for status in LeaseStatus
        }

    @classmethod
    def get_active_leases(cls, *, user: User) -> QuerySet[Lease]:
        return cls.get_queryset(user=user).filter(
            status__in=OCCUPANCY_LEASE_STATUSES
        )

    @classmethod
    def get_expiring_leases(
        cls,
        *,
        user: User,
        today: date,
        days: int = 90,
    ) -> QuerySet[Lease]:
        return cls.get_active_leases(user=user).filter(
            end_date__gte=today,
            end_date__lte=today + timedelta(days=days),
        )
