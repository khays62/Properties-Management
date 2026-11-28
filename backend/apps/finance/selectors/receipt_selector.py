from uuid import UUID

from django.db.models import Q, QuerySet

from apps.accounts.models import User
from common.constants import UserRole
from common.permissions import has_role

from ..models import Receipt
from .finance_access_selector import FinanceAccessSelector, tenant_name_search


class ReceiptSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[Receipt]:
        queryset = Receipt.objects.select_related(
            "payment",
            "payment__tenant",
            "payment__tenant__user",
        )
        if has_role(user, (UserRole.ACCOUNTANT,)):
            return queryset
        return queryset.filter(
            payment__tenant__in=FinanceAccessSelector.get_accessible_tenants(
                user=user
            )
        )

    @classmethod
    def get_receipts(
        cls,
        *,
        user: User,
        tenant_id: str | None = None,
        payment_id: str | None = None,
        search: str | None = None,
    ) -> QuerySet[Receipt]:
        queryset = cls.get_queryset(user=user)
        for value, lookup in (
            (tenant_id, "payment__tenant_id"),
            (payment_id, "payment_id"),
        ):
            if value:
                try:
                    object_id = UUID(value)
                except (TypeError, ValueError):
                    if lookup == "payment_id":
                        queryset = queryset.filter(
                            Q(payment__reference_number__icontains=value)
                            | tenant_name_search(
                                value,
                                user_lookup="payment__tenant__user",
                            )
                        )
                    else:
                        queryset = queryset.filter(
                            tenant_name_search(
                                value,
                                user_lookup="payment__tenant__user",
                            )
                        )
                else:
                    queryset = queryset.filter(**{lookup: object_id})
        if search:
            queryset = queryset.filter(
                Q(receipt_number__icontains=search)
                | Q(payment__reference_number__icontains=search)
            )
        return queryset.distinct()
