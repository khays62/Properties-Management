from apps.accounts.models import User

from ..selectors.maintenance_selector import MaintenanceSelector
from ..selectors.report_filters import ReportFilters


class MaintenanceReportService:
    @staticmethod
    def get_report(*, user: User, filters: ReportFilters) -> dict[str, int]:
        return MaintenanceSelector.get_status_counts(user=user, filters=filters)
