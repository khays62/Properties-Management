from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.leases.models import Tenant
from common.constants import UserRole
from common.permissions import has_role


REPORT_ROLES = (
    UserRole.OWNER,
    UserRole.PROPERTY_MANAGER,
    UserRole.ACCOUNTANT,
)


class CanViewReports(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        if has_role(request.user, REPORT_ROLES):
            return True
        return (
            getattr(view, "report_name", None) == "dashboard"
            and has_role(request.user, (UserRole.TENANT,))
            and Tenant.objects.filter(user=request.user).exists()
        )
