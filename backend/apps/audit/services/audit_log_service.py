import json
from dataclasses import dataclass
from typing import Any

from django.core.serializers.json import DjangoJSONEncoder
from django.db import transaction
from rest_framework.request import Request

from apps.accounts.models import User
from apps.properties.services.validation import validate_model

from ..models import AuditLog


@dataclass(frozen=True)
class AuditContext:
    ip_address: str | None = None
    user_agent: str = ""

    @classmethod
    def from_request(cls, request: Request) -> "AuditContext":
        return cls(
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )


class AuditLogService:
    @staticmethod
    def log_action(
        *,
        user: User | None,
        action: str,
        model_name: str,
        object_id: str,
        old_data: dict[str, Any] | None = None,
        new_data: dict[str, Any] | None = None,
        context: AuditContext | None = None,
    ) -> AuditLog:
        audit_log = AuditLog(
            user=user,
            action=action,
            model_name=model_name,
            object_id=str(object_id),
            old_data=AuditLogService._json_safe(old_data),
            new_data=AuditLogService._json_safe(new_data),
            ip_address=context.ip_address if context else None,
            user_agent=context.user_agent if context else "",
        )
        validate_model(audit_log)
        with transaction.atomic():
            audit_log.save()
        return audit_log

    @staticmethod
    def _json_safe(data: dict[str, Any] | None) -> dict[str, Any] | None:
        if data is None:
            return None
        return json.loads(json.dumps(data, cls=DjangoJSONEncoder))
