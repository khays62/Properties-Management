from decimal import Decimal

from apps.accounts.models import User

from ..selectors.finance_selector import FinanceSelector
from ..selectors.report_filters import ReportFilters


class FinanceReportService:
    @staticmethod
    def get_summary(*, user: User, filters: ReportFilters) -> dict[str, Decimal]:
        return FinanceSelector.get_totals(user=user, filters=filters)
