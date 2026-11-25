from django.db.models import QuerySet
from rest_framework import serializers, viewsets

from .models import AuditLog
from .permissions import CanViewAuditLogs
from .selectors.audit_selector import AuditSelector
from .serializers import AuditLogDetailSerializer, AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = (CanViewAuditLogs,)

    def get_queryset(self) -> QuerySet[AuditLog]:
        return AuditSelector.get_logs(
            action=self.request.query_params.get("action"),
            model_name=self.request.query_params.get("model_name"),
            user_id=self.request.query_params.get("user"),
            date=self.request.query_params.get("date"),
            object_id=self.request.query_params.get("object_id"),
            search=self.request.query_params.get("search"),
        )

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        if self.action == "retrieve":
            return AuditLogDetailSerializer
        return AuditLogSerializer
