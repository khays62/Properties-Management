from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import UserRole
from common.permissions import has_role

from ..models import Lease, RenewalAlert, Tenant
from ..selectors.tenant_selector import TenantSelector


READ_ACTIONS = ("list", "retrieve")


class CanManageLeases(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        if has_role(
            request.user,
            (UserRole.OWNER, UserRole.PROPERTY_MANAGER),
        ):
            return True
        return (
            bool(getattr(request.user, "is_authenticated", False))
            and getattr(view, "action", None) in READ_ACTIONS
            and Tenant.objects.filter(user=request.user).exists()
        )

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Any,
    ) -> bool:
        user: User = request.user
        if isinstance(obj, Tenant):
            return TenantSelector.user_can_manage_tenant(user, obj)
        if isinstance(obj, Lease):
            if has_role(user, (UserRole.OWNER, UserRole.PROPERTY_MANAGER)):
                return PropertySelector.user_can_manage_property(
                    user,
                    obj.unit.property,
                )
            return (
                getattr(view, "action", None) in READ_ACTIONS
                and obj.tenant.user_id == user.pk
            )
        return False


class CanManageTenantProfiles(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        return has_role(
            request.user,
            (UserRole.OWNER, UserRole.PROPERTY_MANAGER),
        )

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Tenant,
    ) -> bool:
        return TenantSelector.user_can_manage_tenant(request.user, obj)


class CanManageRenewals(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        if has_role(
            request.user,
            (UserRole.OWNER, UserRole.PROPERTY_MANAGER),
        ):
            return True
        return (
            bool(getattr(request.user, "is_authenticated", False))
            and getattr(view, "action", None) in READ_ACTIONS
            and Tenant.objects.filter(user=request.user).exists()
        )

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: RenewalAlert,
    ) -> bool:
        user: User = request.user
        if has_role(user, (UserRole.OWNER, UserRole.PROPERTY_MANAGER)):
            return PropertySelector.user_can_manage_property(
                user,
                obj.lease.unit.property,
            )
        return (
            getattr(view, "action", None) in READ_ACTIONS
            and obj.lease.tenant.user_id == user.pk
        )
