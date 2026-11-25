from datetime import date

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User

from ..selectors.lease_selector import LeaseSelector
from ..selectors.report_filters import ReportFilters


EXPIRY_WINDOWS = (30, 60, 90)


class LeaseReportService:
    @staticmethod
    def get_report(
        *,
        user: User,
        filters: ReportFilters,
        days: int = 90,
        today: date | None = None,
    ) -> dict[str, int]:
        if days not in EXPIRY_WINDOWS:
            raise ValidationError(
                {"days": "Choose an expiry window of 30, 60, or 90 days."}
            )
        counts = LeaseSelector.get_status_counts(user=user, filters=filters)
        counts["expiring_leases"] = LeaseSelector.get_expiring_count(
            user=user,
            filters=filters,
            today=today or timezone.localdate(),
            days=days,
        )
        counts["expiring_within_days"] = days
        return counts
