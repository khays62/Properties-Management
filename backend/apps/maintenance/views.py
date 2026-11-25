from uuid import UUID

from django.db.models import QuerySet
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from .models import (
    MaintenanceActivity,
    MaintenanceAttachment,
    MaintenanceTicket,
)
from .permissions import (
    CanManageMaintenance,
    CanManageMaintenanceAssignments,
)
from .selectors.activity_selector import MaintenanceActivitySelector
from .selectors.maintenance_selector import MaintenanceSelector
from .serializers import (
    MaintenanceActivitySerializer,
    MaintenanceAssignmentSerializer,
    MaintenanceAttachmentSerializer,
    MaintenanceResolveSerializer,
    MaintenanceTicketDetailSerializer,
    MaintenanceTicketSerializer,
    MaintenanceTransitionSerializer,
)
from .services.maintenance_attachment_service import MaintenanceAttachmentService
from .services.maintenance_service import MaintenanceService


class MaintenanceTicketViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (CanManageMaintenance,)

    def get_permissions(self):
        permissions = super().get_permissions()
        if self.action == "assign":
            permissions.append(CanManageMaintenanceAssignments())
        return permissions

    def get_queryset(self) -> QuerySet[MaintenanceTicket]:
        queryset = MaintenanceSelector.get_tickets(
            user=self.request.user,
            status=self.request.query_params.get("status"),
            priority=self.request.query_params.get("priority"),
            category=self.request.query_params.get("category"),
            tenant_id=self.request.query_params.get("tenant"),
            property_id=self.request.query_params.get("property"),
            unit_id=self.request.query_params.get("unit"),
            assigned_to_id=self.request.query_params.get("assigned_to"),
            search=self.request.query_params.get("search"),
        )
        if self.action == "retrieve":
            queryset = queryset.prefetch_related("attachments", "activities")
        return queryset

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        if self.action == "retrieve":
            return MaintenanceTicketDetailSerializer
        return MaintenanceTicketSerializer

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        values = dict(serializer.validated_data)
        unit = values.pop("unit")
        tenant = values.pop("tenant", None)
        serializer.instance = MaintenanceService.create_ticket(
            created_by=self.request.user,
            unit=unit,
            tenant=tenant,
            **values,
        )

    def perform_update(self, serializer: serializers.BaseSerializer) -> None:
        serializer.instance = MaintenanceService.update_ticket(
            serializer.instance,
            updated_by=self.request.user,
            **serializer.validated_data,
        )

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request: Request, pk: str | None = None) -> Response:
        input_serializer = MaintenanceAssignmentSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        ticket = MaintenanceService.assign_ticket(
            self.get_object(),
            assigned_to=input_serializer.validated_data["assigned_to"],
            assigned_by=request.user,
            notes=input_serializer.validated_data.get("notes", ""),
        )
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"], url_path="start")
    def start(self, request: Request, pk: str | None = None) -> Response:
        input_serializer = MaintenanceTransitionSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        ticket = MaintenanceService.start_work(
            self.get_object(),
            started_by=request.user,
            notes=input_serializer.validated_data.get("notes", ""),
        )
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request: Request, pk: str | None = None) -> Response:
        input_serializer = MaintenanceResolveSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        ticket = MaintenanceService.resolve_ticket(
            self.get_object(),
            resolved_by=request.user,
            **input_serializer.validated_data,
        )
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request: Request, pk: str | None = None) -> Response:
        input_serializer = MaintenanceTransitionSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        ticket = MaintenanceService.close_ticket(
            self.get_object(),
            closed_by=request.user,
            notes=input_serializer.validated_data.get("notes", ""),
        )
        return Response(self.get_serializer(ticket).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request: Request, pk: str | None = None) -> Response:
        input_serializer = MaintenanceTransitionSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        ticket = MaintenanceService.cancel_ticket(
            self.get_object(),
            cancelled_by=request.user,
            notes=input_serializer.validated_data.get("notes", ""),
        )
        return Response(self.get_serializer(ticket).data)


class MaintenanceAttachmentViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = MaintenanceAttachmentSerializer
    permission_classes = (CanManageMaintenance,)

    def get_queryset(self) -> QuerySet[MaintenanceAttachment]:
        queryset = MaintenanceSelector.get_attachments(user=self.request.user)
        ticket_id = self.request.query_params.get("ticket")
        if ticket_id:
            queryset = self._filter_ticket_id(queryset, ticket_id)
        return queryset

    @staticmethod
    def _filter_ticket_id(queryset, ticket_id: str):
        try:
            parsed_id = UUID(ticket_id)
        except (TypeError, ValueError):
            return queryset.none()
        return queryset.filter(ticket_id=parsed_id)

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        ticket = serializer.validated_data["ticket"]
        self.check_object_permissions(self.request, ticket)
        serializer.instance = MaintenanceAttachmentService.upload_attachment(
            ticket=ticket,
            file=serializer.validated_data["file"],
            uploaded_by=self.request.user,
        )


class MaintenanceActivityViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = MaintenanceActivitySerializer
    permission_classes = (CanManageMaintenance,)

    def get_queryset(self) -> QuerySet[MaintenanceActivity]:
        queryset = MaintenanceActivitySelector.get_queryset(user=self.request.user)
        ticket_id = self.request.query_params.get("ticket")
        if ticket_id:
            try:
                parsed_id = UUID(ticket_id)
            except (TypeError, ValueError):
                return queryset.none()
            queryset = queryset.filter(ticket_id=parsed_id)
        return queryset
