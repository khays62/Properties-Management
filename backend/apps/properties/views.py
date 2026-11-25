from django.db.models import QuerySet
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.audit.services.audit_log_service import AuditContext

from .models import Property, Unit, UnitImage
from .permissions import CanManageProperty, CanManageUnit
from .selectors.property_selector import PropertySelector
from .selectors.unit_selector import UnitSelector
from .serializers import (
    PropertyDetailSerializer,
    PropertySerializer,
    UnitDetailSerializer,
    UnitImageSerializer,
    UnitSerializer,
)
from .services.property_service import PropertyService
from .services.unit_service import UnitService


class PropertyViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (CanManageProperty,)

    def get_queryset(self) -> QuerySet[Property]:
        queryset = PropertySelector.get_properties(
            user=self.request.user,
            status=self.request.query_params.get("status"),
            city=self.request.query_params.get("city"),
            search=self.request.query_params.get("search"),
        )
        if self.action == "retrieve":
            queryset = queryset.prefetch_related("units")
        return queryset

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        if self.action == "retrieve":
            return PropertyDetailSerializer
        return PropertySerializer

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        serializer.instance = PropertyService.create_property(
            owner=self.request.user,
            **serializer.validated_data,
        )

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request: Request, pk: str | None = None) -> Response:
        property_obj = self.get_object()
        archived_property = PropertyService.archive_property(
            property_obj,
            archived_by=request.user,
            audit_context=AuditContext.from_request(request),
        )
        return Response(self.get_serializer(archived_property).data)


class UnitViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (CanManageUnit,)

    def get_queryset(self) -> QuerySet[Unit]:
        queryset = UnitSelector.get_units(
            user=self.request.user,
            property_id=self.request.query_params.get("property"),
            status=self.request.query_params.get("status"),
            search=self.request.query_params.get("search"),
        )
        if self.action == "retrieve":
            queryset = queryset.prefetch_related("images")
        return queryset

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        if self.action == "retrieve":
            return UnitDetailSerializer
        return UnitSerializer

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        serializer.instance = UnitService.create_unit(
            created_by=self.request.user,
            **serializer.validated_data,
        )

    def perform_update(self, serializer: serializers.BaseSerializer) -> None:
        property_obj = serializer.validated_data.get(
            "property",
            serializer.instance.property,
        )
        self.check_object_permissions(self.request, property_obj)
        serializer.save()

    @action(detail=False, methods=["get"], url_path="availability")
    def availability(self, request: Request) -> Response:
        return Response(UnitSelector.get_availability(user=request.user))


class UnitImageViewSet(viewsets.ModelViewSet):
    serializer_class = UnitImageSerializer
    permission_classes = (CanManageUnit,)
    queryset = UnitImage.objects.all()

    def get_queryset(self) -> QuerySet[UnitImage]:
        return UnitSelector.get_image_queryset(
            user=self.request.user,
            unit_id=self.request.query_params.get("unit"),
        )

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        self.check_object_permissions(self.request, serializer.validated_data["unit"])
        serializer.save()

    def perform_update(self, serializer: serializers.BaseSerializer) -> None:
        unit = serializer.validated_data.get("unit", serializer.instance.unit)
        self.check_object_permissions(self.request, unit)
        serializer.save()
