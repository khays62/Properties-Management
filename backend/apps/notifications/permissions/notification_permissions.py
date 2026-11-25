from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from ..models import Notification


class CanAccessOwnNotifications(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        return bool(getattr(request.user, "is_authenticated", False))

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Notification,
    ) -> bool:
        return obj.user_id == request.user.pk
