from uuid import UUID

from django.db.models import Q, QuerySet

from apps.accounts.models import User
from apps.leases.models import Lease
from common.constants import UserRole
from common.permissions import has_role

from ..models import Payment
from .finance_access_selector import FinanceAccessSelector


class PaymentSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[Payment]:
        queryset = Payment.objects.select_related(
            "tenant",
            "tenant__user",
        ).prefetch_related(
            "allocations",
            "allocations__rent_charge",
            "allocations__rent_charge__lease",
            "allocations__rent_charge__lease__unit__property",
        )
        if has_role(user, (UserRole.ACCOUNTANT,)):
            return queryset
        return queryset.filter(
            tenant__in=FinanceAccessSelector.get_accessible_tenants(user=user)
        )

    @classmethod
    def get_payments(
        cls,
        *,
        user: User,
        status: str | None = None,
        tenant_id: str | None = None,
        payment_method: str | None = None,
        search: str | None = None,
    ) -> QuerySet[Payment]:
        queryset = cls.get_queryset(user=user)
        if status:
            queryset = queryset.filter(status=status)
        if payment_method:
            queryset = queryset.filter(payment_method=payment_method)
        if tenant_id:
            try:
                object_id = UUID(tenant_id)
            except (TypeError, ValueError):
                return queryset.none()
            queryset = queryset.filter(tenant_id=object_id)
        if search:
            queryset = queryset.filter(
                Q(tenant__user__email__icontains=search)
                | Q(tenant__user__first_name__icontains=search)
                | Q(tenant__user__last_name__icontains=search)
                | Q(reference_number__icontains=search)
            )
        return queryset.distinct()

    @staticmethod
    def user_can_manage_tenant(*, user: User, tenant_id: UUID) -> bool:
        return FinanceAccessSelector.user_can_manage_tenant(
            user=user,
            tenant_id=tenant_id,
        )

    @staticmethod
    def user_can_manage_charge(*, user: User, lease: Lease) -> bool:
        return FinanceAccessSelector.user_can_manage_lease(
            user=user,
            lease=lease,
        )
