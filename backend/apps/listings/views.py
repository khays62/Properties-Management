from django.db.models import QuerySet
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response

from apps.audit.services.audit_log_service import AuditContext
from common.constants import ListingStatus

from .models import ListingImage
from .permissions import CanManageListings
from .selectors.listing_selector import ListingSelector
from .serializers import ListingDetailSerializer, ListingImageSerializer, ListingSerializer
from .services.listing_service import ListingService


class ListingViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (CanManageListings,)

    def get_queryset(self) -> QuerySet:
        public = self.action == "public"
        return ListingSelector.get_listings(
            user=None if public else self.request.user,
            public=public,
            status=(
                ListingStatus.PUBLISHED
                if public
                else self.request.query_params.get("status")
            ),
            property_id=self.request.query_params.get("property"),
            city=self.request.query_params.get("city"),
            available_date=self.request.query_params.get("available_date"),
            search=self.request.query_params.get("search"),
        )

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        if self.action in ("retrieve", "public"):
            return ListingDetailSerializer
        return ListingSerializer

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        serializer.instance = ListingService.create_listing(
            created_by=self.request.user,
            **serializer.validated_data,
        )

    @action(detail=True, methods=["post"], url_path="publish")
    def publish(self, request: Request, pk: str | None = None) -> Response:
        listing = ListingService.publish_listing(
            self.get_object(),
            published_by=request.user,
            audit_context=AuditContext.from_request(request),
        )
        return Response(self.get_serializer(listing).data)

    @action(detail=True, methods=["post"], url_path="pause")
    def pause(self, request: Request, pk: str | None = None) -> Response:
        listing = ListingService.pause_listing(self.get_object())
        return Response(self.get_serializer(listing).data)

    @action(detail=True, methods=["post"], url_path="close")
    def close(self, request: Request, pk: str | None = None) -> Response:
        listing = ListingService.close_listing(
            self.get_object(),
            closed_by=request.user,
            audit_context=AuditContext.from_request(request),
        )
        return Response(self.get_serializer(listing).data)

    @action(detail=True, methods=["post"], url_path="expire")
    def expire(self, request: Request, pk: str | None = None) -> Response:
        listing = ListingService.expire_listing(self.get_object())
        return Response(self.get_serializer(listing).data)

    @action(
        detail=False,
        methods=["get"],
        url_path="public",
        permission_classes=(AllowAny,),
        authentication_classes=(),
    )
    def public(self, request: Request) -> Response:
        listings = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(listings)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(listings, many=True)
        return Response(serializer.data)


class ListingImageViewSet(viewsets.ModelViewSet):
    serializer_class = ListingImageSerializer
    permission_classes = (CanManageListings,)
    queryset = ListingImage.objects.all()

    def get_queryset(self) -> QuerySet[ListingImage]:
        return ListingSelector.get_image_queryset(user=self.request.user)

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        self.check_object_permissions(
            self.request,
            serializer.validated_data["listing"],
        )
        serializer.save()

    def perform_update(self, serializer: serializers.BaseSerializer) -> None:
        listing = serializer.validated_data.get(
            "listing",
            serializer.instance.listing,
        )
        self.check_object_permissions(self.request, listing)
        serializer.save()
