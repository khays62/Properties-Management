from typing import Any

from django.db.models import QuerySet
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Applicant, RentalApplication, Screening
from .permissions import CanManageApplications, CanManageScreening
from .selectors.applicant_selector import ApplicantSelector
from .selectors.application_selector import ApplicationSelector
from .selectors.screening_selector import ScreeningSelector
from .serializers import (
    ApplicantSerializer,
    ApplicationRejectionSerializer,
    RentalApplicationDetailSerializer,
    RentalApplicationSerializer,
    ScreeningResultSerializer,
    ScreeningSerializer,
)
from .services.application_service import ApplicationService
from .services.screening_service import ScreeningService


class ApplicantViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ApplicantSerializer
    permission_classes = (CanManageApplications,)

    def get_queryset(self) -> QuerySet[Applicant]:
        return ApplicantSelector.get_applicants(
            user=self.request.user,
            search=self.request.query_params.get("search"),
        )


class RentalApplicationViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (CanManageApplications,)

    def get_queryset(self) -> QuerySet[RentalApplication]:
        return ApplicationSelector.get_applications(
            user=self.request.user,
            status=self.request.query_params.get("status"),
            listing_id=self.request.query_params.get("listing"),
            city=self.request.query_params.get("city"),
            property_id=self.request.query_params.get("property"),
            date=self.request.query_params.get("date"),
            search=self.request.query_params.get("search"),
        )

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        if self.action == "retrieve":
            return RentalApplicationDetailSerializer
        return RentalApplicationSerializer

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        validated_data = dict(serializer.validated_data)
        applicant_data = validated_data.pop("applicant")
        serializer.instance = ApplicationService.create_application(
            applicant_data=applicant_data,
            **validated_data,
        )

    def _detail_response(self, application: RentalApplication) -> Response:
        serializer = RentalApplicationDetailSerializer(
            application,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="review")
    def review(self, request: Request, pk: str | None = None) -> Response:
        application = ApplicationService.submit_for_review(self.get_object())
        return self._detail_response(application)

    @action(detail=True, methods=["post"], url_path="start-screening")
    def start_screening(self, request: Request, pk: str | None = None) -> Response:
        application = ApplicationService.start_screening(self.get_object())
        return self._detail_response(application)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request: Request, pk: str | None = None) -> Response:
        application = ApplicationService.approve_application(self.get_object())
        return self._detail_response(application)

    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request: Request, pk: str | None = None) -> Response:
        serializer = ApplicationRejectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = ApplicationService.reject_application(
            self.get_object(),
            rejection_reason=serializer.validated_data["rejection_reason"],
        )
        return self._detail_response(application)

    @action(detail=True, methods=["post"], url_path="withdraw")
    def withdraw(self, request: Request, pk: str | None = None) -> Response:
        application = ApplicationService.withdraw_application(self.get_object())
        return self._detail_response(application)


class ScreeningViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ScreeningSerializer
    permission_classes = (CanManageScreening,)

    def get_queryset(self) -> QuerySet[Screening]:
        return ScreeningSelector.get_screenings(
            user=self.request.user,
            status=self.request.query_params.get("status"),
            reviewed_by=self.request.query_params.get("reviewed_by"),
        )

    def _result_data(self, request: Request) -> dict[str, Any]:
        serializer = ScreeningResultSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request: Request, pk: str | None = None) -> Response:
        screening = ScreeningService.start_screening(
            self.get_object(),
            reviewed_by=request.user,
        )
        return Response(self.get_serializer(screening).data)

    @action(detail=True, methods=["post"], url_path="pass", url_name="pass")
    def pass_screening(self, request: Request, pk: str | None = None) -> Response:
        screening = ScreeningService.pass_screening(
            self.get_object(),
            reviewed_by=request.user,
            result_data=self._result_data(request),
        )
        return Response(self.get_serializer(screening).data)

    @action(detail=True, methods=["post"], url_path="fail")
    def fail(self, request: Request, pk: str | None = None) -> Response:
        screening = ScreeningService.fail_screening(
            self.get_object(),
            reviewed_by=request.user,
            result_data=self._result_data(request),
        )
        return Response(self.get_serializer(screening).data)
