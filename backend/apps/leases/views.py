from django.db.models import QuerySet
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Lease, RenewalAlert, Tenant
from .permissions import (
    CanManageLeases,
    CanManageRenewals,
    CanManageTenantProfiles,
)
from .selectors.lease_selector import LeaseSelector
from .selectors.renewal_selector import RenewalSelector
from .selectors.tenant_selector import TenantSelector
from .serializers import (
    LeaseDetailSerializer,
    LeaseRenewalSerializer,
    LeaseSerializer,
    RenewalAlertSerializer,
    TenantSerializer,
)
from .services.lease_service import LeaseService
from .services.renewal_service import RenewalService
from .services.tenant_service import TenantService


class TenantViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = TenantSerializer
    permission_classes = (CanManageTenantProfiles,)

    def get_queryset(self) -> QuerySet[Tenant]:
        return TenantSelector.get_tenants(
            user=self.request.user,
            status=self.request.query_params.get("status"),
            search=self.request.query_params.get("search"),
        )

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        data = dict(serializer.validated_data)
        user = data.pop("user")
        serializer.instance = TenantService.create_tenant(user=user, **data)


class LeaseViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (CanManageLeases,)

    def get_queryset(self) -> QuerySet[Lease]:
        return LeaseSelector.get_leases(
            user=self.request.user,
            status=self.request.query_params.get("status"),
            tenant_id=self.request.query_params.get("tenant"),
            property_id=self.request.query_params.get("property"),
            unit_id=self.request.query_params.get("unit"),
            start_date=self.request.query_params.get("start_date"),
            end_date=self.request.query_params.get("end_date"),
            search=self.request.query_params.get("search"),
        )

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        if self.action != "create":
            return LeaseDetailSerializer
        return LeaseSerializer

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        serializer.instance = LeaseService.create_lease(
            created_by=self.request.user,
            **serializer.validated_data,
        )

    def _detail_response(self, lease: Lease) -> Response:
        serializer = LeaseDetailSerializer(
            lease,
            context=self.get_serializer_context(),
        )
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="submit-for-approval")
    def submit_for_approval(self, request: Request, pk: str | None = None) -> Response:
        lease = LeaseService.submit_for_approval(
            self.get_object(),
            changed_by=request.user,
        )
        return self._detail_response(lease)

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request: Request, pk: str | None = None) -> Response:
        lease = LeaseService.approve_lease(
            self.get_object(),
            approved_by=request.user,
        )
        return self._detail_response(lease)

    @action(detail=True, methods=["post"], url_path="activate")
    def activate(self, request: Request, pk: str | None = None) -> Response:
        lease = LeaseService.activate_lease(
            self.get_object(),
            changed_by=request.user,
        )
        return self._detail_response(lease)

    @action(detail=True, methods=["post"], url_path="renew")
    def renew(self, request: Request, pk: str | None = None) -> Response:
        renewal_serializer = LeaseRenewalSerializer(data=request.data)
        renewal_serializer.is_valid(raise_exception=True)
        successor = LeaseService.renew_lease(
            self.get_object(),
            new_end_date=renewal_serializer.validated_data["new_end_date"],
            changed_by=request.user,
        )
        return self._detail_response(successor)

    @action(detail=True, methods=["post"], url_path="terminate")
    def terminate(self, request: Request, pk: str | None = None) -> Response:
        lease = LeaseService.terminate_lease(
            self.get_object(),
            changed_by=request.user,
        )
        return self._detail_response(lease)

    @action(detail=True, methods=["post"], url_path="expire")
    def expire(self, request: Request, pk: str | None = None) -> Response:
        lease = LeaseService.expire_lease(
            self.get_object(),
            changed_by=request.user,
        )
        return self._detail_response(lease)


class RenewalAlertViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = RenewalAlertSerializer
    permission_classes = (CanManageRenewals,)

    def get_queryset(self) -> QuerySet[RenewalAlert]:
        return RenewalSelector.get_alerts(
            user=self.request.user,
            status=self.request.query_params.get("status"),
            lease_id=self.request.query_params.get("lease"),
            property_id=self.request.query_params.get("property"),
        )

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request: Request, pk: str | None = None) -> Response:
        alert = RenewalService.mark_alert_read(self.get_object())
        return Response(self.get_serializer(alert).data)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request: Request, pk: str | None = None) -> Response:
        alert = RenewalService.resolve_alert(self.get_object())
        return Response(self.get_serializer(alert).data)
