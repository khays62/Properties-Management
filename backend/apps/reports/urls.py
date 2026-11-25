from django.urls import path

from .views import (
    DashboardView,
    FinancialSummaryView,
    LeaseReportView,
    MaintenanceReportView,
    OccupancyReportView,
)

app_name = "reports"

urlpatterns = [
    path("reports/dashboard/", DashboardView.as_view(), name="dashboard"),
    path("reports/occupancy/", OccupancyReportView.as_view(), name="occupancy"),
    path(
        "reports/financial-summary/",
        FinancialSummaryView.as_view(),
        name="financial-summary",
    ),
    path("reports/leases/", LeaseReportView.as_view(), name="leases"),
    path(
        "reports/maintenance/",
        MaintenanceReportView.as_view(),
        name="maintenance",
    ),
]
