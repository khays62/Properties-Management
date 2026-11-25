from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from common.constants import UserRole
from common.permissions import has_role


class CanViewAuditLogs(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        return has_role(
            request.user,
            (
                UserRole.OWNER,
                UserRole.PROPERTY_MANAGER,
                UserRole.ACCOUNTANT,
            ),
        )
