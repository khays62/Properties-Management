from django.utils import timezone

from apps.accounts.models import User
from apps.applications.models import RentalApplication, Screening
from apps.listings.models import Listing
from apps.properties.models import Unit
from common.constants import ScreeningStatus

from .report_filters import ReportFilters, ReportScope, apply_date_range
from .lease_selector import LeaseSelector
from .maintenance_selector import MaintenanceSelector


class DashboardSelector:
    @classmethod
    def get_counts(cls, *, user: User, filters: ReportFilters) -> dict[str, int]:
        properties = ReportScope.get_properties(user=user, filters=filters)
        property_listings = Listing.objects.filter(unit__property__in=properties)
        listings = apply_date_range(
            property_listings,
            field="created_at",
            filters=filters,
            is_datetime=True,
        )
        applications = apply_date_range(
            RentalApplication.objects.filter(
                listing__in=property_listings
            ),
            field="submitted_at",
            filters=filters,
            is_datetime=True,
        )
        if filters.status:
            listings = listings.filter(status=filters.status)
            applications = applications.filter(status=filters.status)
        lease_counts = LeaseSelector.get_status_counts(user=user, filters=filters)
        maintenance_counts = MaintenanceSelector.get_status_counts(
            user=user,
            filters=filters,
        )

        return {
            "properties_count": properties.count(),
            "units_count": Unit.objects.filter(
                is_active=True,
                property__in=properties,
            ).count(),
            "listings_count": listings.count(),
            "applications_count": applications.count(),
            "leases_count": lease_counts["leases_count"],
            "maintenance_count": sum(maintenance_counts.values()),
            "active_leases_count": lease_counts["active_leases"],
            "pending_screening_count": cls._pending_screenings(
                user=user,
                filters=filters,
            ),
            "expiring_leases_count": LeaseSelector.get_expiring_count(
                user=user,
                filters=filters,
                today=timezone.localdate(),
                days=90,
            ),
            "open_tickets": maintenance_counts["open_tickets"],
        }

    @staticmethod
    def _pending_screenings(*, user: User, filters: ReportFilters) -> int:
        queryset = Screening.objects.filter(
            application__listing__unit__property__in=ReportScope.get_properties(
                user=user,
                filters=filters,
            ),
            status=ScreeningStatus.PENDING,
        )
        queryset = apply_date_range(
            queryset,
            field="application__submitted_at",
            filters=filters,
            is_datetime=True,
        )
        if filters.status:
            queryset = queryset.filter(application__status=filters.status)
        return queryset.count()
