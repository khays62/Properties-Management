from uuid import UUID

from django.db.models import Q, QuerySet, Sum

from apps.accounts.models import User

from ..models import Deposit
from .finance_access_selector import FinanceAccessSelector


class DepositSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[Deposit]:
        queryset = Deposit.objects.select_related(
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

    @classmethod
    def get_deposits(
        cls,
        *,
        user: User,
        status: str | None = None,
        lease_id: str | None = None,
        tenant_id: str | None = None,
        search: str | None = None,
    ) -> QuerySet[Deposit]:
        queryset = cls.get_queryset(user=user)
        if status:
            queryset = queryset.filter(status=status)
        for value, lookup in (
            (lease_id, "lease_id"),
            (tenant_id, "lease__tenant_id"),
        ):
            if value:
                try:
                    object_id = UUID(value)
                except (TypeError, ValueError):
                    return queryset.none()
                queryset = queryset.filter(**{lookup: object_id})
        if search:
            queryset = queryset.filter(
                Q(lease__tenant__user__email__icontains=search)
                | Q(lease__tenant__user__first_name__icontains=search)
                | Q(lease__tenant__user__last_name__icontains=search)
                | Q(reference_number__icontains=search)
            )
        return queryset.distinct()

    @classmethod
    def get_outstanding_total(cls, *, user: User):
        return (
            cls.get_queryset(user=user)
            .filter(status__in=("PENDING", "PARTIALLY_PAID"))
            .aggregate(total=Sum("required_amount") - Sum("paid_amount"))["total"]
            or 0
        )
