from collections.abc import Iterable
from typing import Any, ClassVar

from django.db import models
from django.utils import timezone
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response


class AuditMixin:
    """Base hooks for audit-aware viewsets; fields remain application-owned."""

    def perform_create(self, serializer: Any) -> None:
        if hasattr(serializer, "save") and hasattr(self.request.user, "is_authenticated"):
            serializer.save()

    def perform_update(self, serializer: Any) -> None:
        serializer.save()


class StatusTransitionMixin:
    """Reusable status-transition contract with no business-specific rules."""

    status_field: str = "status"
    status_transitions: ClassVar[dict[str, Iterable[str]]] = {}

    def get_status(self) -> str:
        return getattr(self, self.status_field)

    def can_transition_to(self, target_status: str) -> bool:
        current_status = self.get_status()
        allowed_statuses = self.status_transitions.get(current_status, ())
        return target_status in allowed_statuses

    def transition_to(self, target_status: str) -> None:
        if not self.can_transition_to(target_status):
            raise ValueError(
                f"Cannot transition from {self.get_status()} to {target_status}"
            )
        setattr(self, self.status_field, target_status)


class SoftDeleteMixin:
    """DRF viewset mixin for models exposing soft-delete methods."""

    @action(detail=True, methods=["post"])
    def soft_delete(self, request: Request, pk: Any = None) -> Response:
        instance = self.get_object()
        instance.soft_delete()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def restore(self, request: Request, pk: Any = None) -> Response:
        instance = self.get_object()
        instance.restore()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
