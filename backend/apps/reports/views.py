from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .permissions import CanViewReports
from .selectors.report_filters import ReportFilters
from .serializers import (
    DashboardSerializer,
    FinancialSummarySerializer,
    LeaseReportSerializer,
    MaintenanceReportSerializer,
    OccupancyReportSerializer,
)
from .services.dashboard_service import DashboardService
from .services.finance_report_service import FinanceReportService
from .services.lease_report_service import LeaseReportService
from .services.maintenance_report_service import MaintenanceReportService
from .services.occupancy_report_service import OccupancyReportService


class BaseReportView(APIView):
    permission_classes = (CanViewReports,)
    report_name = ""

    @staticmethod
    def get_filters(request: Request) -> ReportFilters:
        return ReportFilters.from_query_params(request.query_params)


class DashboardView(BaseReportView):
    report_name = "dashboard"

    def get(self, request: Request) -> Response:
        data = DashboardService.get_dashboard(
            user=request.user,
            filters=self.get_filters(request),
        )
        return Response(DashboardSerializer(data).data)


class OccupancyReportView(BaseReportView):
    report_name = "occupancy"

    def get(self, request: Request) -> Response:
        data = OccupancyReportService.get_report(
            user=request.user,
            filters=self.get_filters(request),
        )
        return Response(OccupancyReportSerializer(data).data)


class FinancialSummaryView(BaseReportView):
    report_name = "financial-summary"

    def get(self, request: Request) -> Response:
        data = FinanceReportService.get_summary(
            user=request.user,
            filters=self.get_filters(request),
        )
        return Response(FinancialSummarySerializer(data).data)


class LeaseReportView(BaseReportView):
    report_name = "leases"

    def get(self, request: Request) -> Response:
        raw_days = request.query_params.get("days", "90")
        try:
            days = int(raw_days)
        except (TypeError, ValueError) as exc:
            raise ValidationError(
                {"days": "Choose an expiry window of 30, 60, or 90 days."}
            ) from exc
        data = LeaseReportService.get_report(
            user=request.user,
            filters=self.get_filters(request),
            days=days,
        )
        return Response(LeaseReportSerializer(data).data)


class MaintenanceReportView(BaseReportView):
    report_name = "maintenance"

    def get(self, request: Request) -> Response:
        data = MaintenanceReportService.get_report(
            user=request.user,
            filters=self.get_filters(request),
        )
        return Response(MaintenanceReportSerializer(data).data)
