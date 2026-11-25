from decimal import Decimal

from django.db.models import QuerySet, Sum

from apps.accounts.models import User
from apps.finance.models import Deposit, Payment, PaymentAllocation, RentCharge
from common.constants import (
    DepositStatus,
    PaymentStatus,
    RentChargeStatus,
    UserRole,
)
from common.permissions import has_role

from .report_filters import ReportFilters, ReportScope, apply_date_range


ZERO = Decimal("0.00")
ACTIVE_DEPOSIT_STATUSES = (
    DepositStatus.PARTIALLY_PAID,
    DepositStatus.PAID,
    DepositStatus.PARTIALLY_REFUNDED,
)


class FinanceSelector:
    @staticmethod
    def get_rent_charges(
        *,
        user: User,
        filters: ReportFilters,
    ) -> QuerySet[RentCharge]:
        queryset = RentCharge.objects.filter(
            lease__in=ReportScope.get_leases(user=user, filters=filters)
        )
        if filters.status in RentChargeStatus.values:
            queryset = queryset.filter(status=filters.status)
        return apply_date_range(
            queryset,
            field="due_date",
            filters=filters,
        )

    @staticmethod
    def get_deposits(
        *,
        user: User,
        filters: ReportFilters,
    ) -> QuerySet[Deposit]:
        queryset = Deposit.objects.filter(
            lease__in=ReportScope.get_leases(user=user, filters=filters)
        )
        if filters.status in DepositStatus.values:
            queryset = queryset.filter(status=filters.status)
        return apply_date_range(
            queryset,
            field="lease__created_at",
            filters=filters,
            is_datetime=True,
        )

    @classmethod
    def get_payments(
        cls,
        *,
        user: User,
        filters: ReportFilters,
    ) -> QuerySet[Payment]:
        queryset = Payment.objects.all()
        if filters.status in PaymentStatus.values:
            queryset = queryset.filter(status=filters.status)
        if has_role(user, (UserRole.TENANT,)):
            queryset = queryset.filter(tenant__user=user)
        elif not has_role(user, (UserRole.ACCOUNTANT,)):
            accessible_tenant_ids = (
                ReportScope.get_leases(user=user, filters=filters)
                .values("tenant_id")
                .distinct()
            )
            queryset = queryset.filter(tenant_id__in=accessible_tenant_ids)
        return apply_date_range(
            queryset,
            field="payment_date",
            filters=filters,
        )

    @classmethod
    def get_totals(
        cls,
        *,
        user: User,
        filters: ReportFilters,
    ) -> dict[str, Decimal]:
        charges = cls.get_rent_charges(user=user, filters=filters)
        deposits = cls.get_deposits(user=user, filters=filters)
        allocations = PaymentAllocation.objects.filter(
            rent_charge__in=charges,
            payment__status=PaymentStatus.COMPLETED,
        )
        if filters.status in PaymentStatus.values:
            allocations = allocations.filter(payment__status=filters.status)
        allocations = apply_date_range(
            allocations,
            field="payment__payment_date",
            filters=filters,
        )

        charge_totals = charges.exclude(status=RentChargeStatus.CANCELLED).aggregate(
            total_rent_billed=Sum("amount"),
            total_outstanding_balance=Sum("balance"),
        )
        overdue_totals = charges.filter(
            status=RentChargeStatus.OVERDUE,
            balance__gt=0,
        ).aggregate(total=Sum("balance"))
        collected = allocations.aggregate(total=Sum("amount_allocated"))
        deposit_totals = deposits.aggregate(
            total_security_deposits=Sum("required_amount"),
        )
        active_deposit_totals = deposits.filter(
            status__in=ACTIVE_DEPOSIT_STATUSES
        ).aggregate(total=Sum("paid_amount"))

        return {
            "total_rent_billed": charge_totals["total_rent_billed"] or ZERO,
            "total_rent_collected": collected["total"] or ZERO,
            "total_outstanding_balance": (
                charge_totals["total_outstanding_balance"] or ZERO
            ),
            "total_overdue_balance": overdue_totals["total"] or ZERO,
            "total_security_deposits": (
                deposit_totals["total_security_deposits"] or ZERO
            ),
            "active_deposit_balances": active_deposit_totals["total"] or ZERO,
        }
