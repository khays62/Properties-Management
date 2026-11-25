from decimal import Decimal

from django.db.models import Q, Sum

from apps.accounts.models import User
from apps.finance.models import Payment, RentCharge
from apps.maintenance.models import MaintenanceTicket
from common.constants import (
    LeaseStatus,
    MaintenanceStatus,
    PaymentStatus,
    RentChargeStatus,
    UserRole,
)

from ..selectors.dashboard_selector import DashboardSelector
from ..selectors.finance_selector import FinanceSelector
from ..selectors.report_filters import ReportFilters, ReportScope
from .finance_report_service import FinanceReportService
from .occupancy_report_service import OccupancyReportService


class DashboardService:
    @classmethod
    def get_dashboard(
        cls,
        *,
        user: User,
        filters: ReportFilters,
    ) -> dict:
        if user.role == UserRole.TENANT:
            return cls._tenant_dashboard(user=user, filters=filters)

        counts = DashboardSelector.get_counts(user=user, filters=filters)
        occupancy = OccupancyReportService.get_report(user=user, filters=filters)
        finance = FinanceReportService.get_summary(user=user, filters=filters)
        metrics = {
            **counts,
            "occupancy_rate": occupancy["occupancy_rate"],
            "outstanding_rent": finance["total_outstanding_balance"],
            "overdue_rent": finance["total_overdue_balance"],
            "collected_rent": finance["total_rent_collected"],
        }
        if user.role == UserRole.ACCOUNTANT:
            payments = FinanceSelector.get_payments(user=user, filters=filters)
            metrics.update(
                {
                    "payments_count": payments.count(),
                    "deposits_count": FinanceSelector.get_deposits(
                        user=user,
                        filters=filters,
                    ).count(),
                    "deposits_total": finance["total_security_deposits"],
                    "active_deposit_balances": finance[
                        "active_deposit_balances"
                    ],
                    "overdue_charges": FinanceSelector.get_rent_charges(
                        user=user,
                        filters=filters,
                    ).filter(
                        status=RentChargeStatus.OVERDUE,
                        balance__gt=0,
                    ).count(),
                }
            )
        elif user.role == UserRole.PROPERTY_MANAGER:
            metrics.update(
                {
                    "pending_screening_count": counts["pending_screening_count"],
                    "renewals_count": counts["expiring_leases_count"],
                }
            )
        return {"role": user.role, "metrics": metrics}

    @staticmethod
    def _tenant_dashboard(*, user: User, filters: ReportFilters) -> dict:
        leases = ReportScope.get_leases(user=user, filters=filters)
        charges = FinanceSelector.get_rent_charges(user=user, filters=filters)
        payments = FinanceSelector.get_payments(user=user, filters=filters)
        tickets = MaintenanceTicket.objects.filter(tenant__user=user)
        if filters.status:
            tickets = tickets.filter(status=filters.status)
        if filters.start_date:
            tickets = tickets.filter(created_at__date__gte=filters.start_date)
        if filters.end_date:
            tickets = tickets.filter(created_at__date__lte=filters.end_date)

        charge_totals = charges.exclude(
            status=RentChargeStatus.CANCELLED
        ).aggregate(
            outstanding=Sum("balance"),
            overdue=Sum(
                "balance",
                filter=Q(status=RentChargeStatus.OVERDUE),
            ),
        )
        collected = payments.filter(status=PaymentStatus.COMPLETED).aggregate(
            total=Sum("amount")
        )["total"]
        metrics = {
            "leases_count": leases.count(),
            "active_leases_count": leases.filter(
                status__in=(LeaseStatus.ACTIVE, LeaseStatus.EXPIRING)
            ).count(),
            "charges_count": charges.count(),
            "outstanding_rent": charge_totals["outstanding"] or Decimal("0.00"),
            "overdue_rent": charge_totals["overdue"] or Decimal("0.00"),
            "payments_count": payments.count(),
            "collected_payments": collected or Decimal("0.00"),
            "maintenance_requests_count": tickets.count(),
            "open_tickets": tickets.filter(status=MaintenanceStatus.OPEN).count(),
        }
        return {"role": UserRole.TENANT, "metrics": metrics}
