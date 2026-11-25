from django.db.models import QuerySet
from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from .models import Notification
from .permissions import CanAccessOwnNotifications
from .selectors.notification_selector import NotificationSelector
from .serializers import NotificationDetailSerializer, NotificationSerializer
from .services.notification_service import NotificationService


class NotificationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (CanAccessOwnNotifications,)

    def get_queryset(self) -> QuerySet[Notification]:
        is_read_param = self.request.query_params.get("is_read")
        if is_read_param is None:
            is_read = None
        elif is_read_param.lower() in ("true", "1"):
            is_read = True
        elif is_read_param.lower() in ("false", "0"):
            is_read = False
        else:
            is_read = None
        return NotificationSelector.get_user_notifications(
            user=self.request.user,
            is_read=is_read,
            notification_type=self.request.query_params.get("type"),
            search=self.request.query_params.get("search"),
        )

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        if self.action == "retrieve":
            return NotificationDetailSerializer
        return NotificationSerializer

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request: Request, pk: str | None = None) -> Response:
        notification = NotificationService.mark_read(
            self.get_object(),
            user=request.user,
        )
        return Response(NotificationDetailSerializer(notification).data)

    @action(detail=False, methods=["post"], url_path="mark-all-read")
    def mark_all_read(self, request: Request) -> Response:
        updated_count = NotificationService.mark_all_read(user=request.user)
        return Response(
            {"updated_count": updated_count},
            status=status.HTTP_200_OK,
        )
