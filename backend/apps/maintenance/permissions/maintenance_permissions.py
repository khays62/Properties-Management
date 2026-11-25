from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.leases.models import Tenant
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import UserRole
from common.permissions import has_role

from ..models import MaintenanceActivity, MaintenanceAttachment, MaintenanceTicket
from ..selectors.maintenance_selector import MaintenanceSelector


MANAGER_ROLES = (UserRole.OWNER, UserRole.PROPERTY_MANAGER)
TENANT_ACTIONS = ("create", "list", "retrieve", "cancel")


def _get_ticket(obj: Any) -> MaintenanceTicket:
    if isinstance(obj, MaintenanceTicket):
        return obj
    return obj.ticket


class CanManageMaintenance(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        if has_role(request.user, MANAGER_ROLES):
            return True
        return (
            has_role(request.user, (UserRole.TENANT,))
            and getattr(view, "action", None) in TENANT_ACTIONS
            and Tenant.objects.filter(user=request.user).exists()
        )

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: MaintenanceTicket | MaintenanceAttachment | MaintenanceActivity,
    ) -> bool:
        ticket = _get_ticket(obj)
        if has_role(request.user, MANAGER_ROLES):
            return MaintenanceSelector.user_can_access_ticket(
                user=request.user,
                ticket=ticket,
            )
        return (
            has_role(request.user, (UserRole.TENANT,))
            and getattr(view, "action", None) in TENANT_ACTIONS
            and ticket.tenant.user_id == request.user.pk
        )


class CanManageMaintenanceAssignments(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        return has_role(request.user, MANAGER_ROLES)

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: MaintenanceTicket,
    ) -> bool:
        return PropertySelector.user_can_manage_property(
            request.user,
            obj.unit.property,
        )
