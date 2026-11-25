from decimal import Decimal

from apps.accounts.models import User

from ..selectors.occupancy_selector import OccupancySelector
from ..selectors.report_filters import ReportFilters


class OccupancyReportService:
    @staticmethod
    def get_report(*, user: User, filters: ReportFilters) -> dict[str, int | Decimal]:
        counts = OccupancySelector.get_counts(user=user, filters=filters)
        rentable_units = counts["rentable_units"]
        occupancy_rate = (
            Decimal(counts["occupied_units"]) * Decimal("100") / rentable_units
            if rentable_units
            else Decimal("0")
        )
        occupancy_rate = occupancy_rate.quantize(Decimal("0.01"))
        return {
            "total_properties": counts["total_properties"],
            "total_units": counts["total_units"],
            "occupied_units": counts["occupied_units"],
            "available_units": counts["available_units"],
            "listed_units": counts["listed_units"],
            "maintenance_units": counts["maintenance_units"],
            "rentable_units": rentable_units,
            "occupancy_rate": occupancy_rate,
            "vacancy_rate": (Decimal("100.00") - occupancy_rate).quantize(
                Decimal("0.01")
            )
            if rentable_units
            else Decimal("0.00"),
        }
