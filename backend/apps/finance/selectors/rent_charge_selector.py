from uuid import UUID

from django.db.models import Q, QuerySet, Sum

from apps.accounts.models import User

from ..models import RentCharge, RentSchedule
from .finance_access_selector import FinanceAccessSelector, tenant_name_search


class RentChargeSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[RentCharge]:
        queryset = RentCharge.objects.select_related(
            "lease",
            "lease__tenant",
            "lease__tenant__user",
            "lease__unit",
            "lease__unit__property",
        ).prefetch_related("allocations", "allocations__payment")
        return FinanceAccessSelector.scope_to_leases(
            queryset,
            user=user,
            lease_lookup="lease",
        )

    @staticmethod
    def get_schedules(*, user: User) -> QuerySet[RentSchedule]:
        queryset = RentSchedule.objects.select_related(
            "lease",
            "lease__tenant",
            "lease__tenant__user",
            "lease__unit",
            "lease__unit__property",
        )
        return FinanceAccessSelector.scope_to_leases(
            queryset,
            user=user,
            lease_lookup="lease",
        )

    @staticmethod
    def get_active_schedules(*, user: User) -> QuerySet[RentSchedule]:
        return RentChargeSelector.get_schedules(user=user).filter(is_active=True)

    @classmethod
    def get_charges(
        cls,
        *,
        user: User,
        status: str | None = None,
        tenant_id: str | None = None,
        lease_id: str | None = None,
        billing_month: str | int | None = None,
        billing_year: str | int | None = None,
        search: str | None = None,
    ) -> QuerySet[RentCharge]:
        queryset = cls.get_queryset(user=user)
        if status:
            queryset = queryset.filter(status=status)
        for value, lookup in (
            (tenant_id, "lease__tenant_id"),
            (lease_id, "lease_id"),
        ):
            if value:
                try:
                    object_id = UUID(value)
                except (TypeError, ValueError):
                    if lookup == "lease_id":
                        queryset = queryset.filter(
                            tenant_name_search(
                                value,
                                user_lookup="lease__tenant__user",
                            )
                            | Q(lease__unit__unit_number__icontains=value)
                            | Q(lease__unit__property__name__icontains=value)
                        )
                    else:
                        queryset = queryset.filter(
                            tenant_name_search(
                                value,
                                user_lookup="lease__tenant__user",
                            )
                        )
                else:
                    queryset = queryset.filter(**{lookup: object_id})
        for value, lookup in (
            (billing_month, "billing_month"),
            (billing_year, "billing_year"),
        ):
            if value not in (None, ""):
                try:
                    number = int(value)
                except (TypeError, ValueError):
                    return queryset.none()
                queryset = queryset.filter(**{lookup: number})
        if search:
            queryset = queryset.filter(
                Q(lease__tenant__user__email__icontains=search)
                | Q(lease__tenant__user__first_name__icontains=search)
                | Q(lease__tenant__user__last_name__icontains=search)
                | Q(lease__unit__unit_number__icontains=search)
                | Q(lease__unit__property__name__icontains=search)
                | Q(lease__unit__property__city__icontains=search)
            )
        return queryset

    @classmethod
    def get_overdue_counts(cls, *, user: User) -> dict[str, int]:
        return {
            "overdue_count": cls.get_queryset(user=user)
            .filter(status="OVERDUE")
            .count()
        }

    @classmethod
    def get_outstanding_balance(cls, *, user: User):
        return (
            cls.get_queryset(user=user)
            .exclude(status="CANCELLED")
            .aggregate(total=Sum("balance"))["total"]
            or 0
        )
