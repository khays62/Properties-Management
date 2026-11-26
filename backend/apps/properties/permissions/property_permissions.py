from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from common.constants import UserRole
from common.permissions import has_role

from ..models import Property, Unit
from ..selectors.property_selector import PropertySelector


class CanManageProperty(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        if getattr(view, "action", None) == "create":
            return has_role(request.user, (UserRole.OWNER,))
        return has_role(request.user, (UserRole.OWNER, UserRole.PROPERTY_MANAGER))

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Property,
    ) -> bool:
        return PropertySelector.user_can_manage_property(request.user, obj)


class CanAssignPropertyManager(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        return has_role(request.user, (UserRole.OWNER,))

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Property,
    ) -> bool:
        return obj.owner_id == request.user.pk


class CanManageUnit(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        return has_role(request.user, (UserRole.OWNER, UserRole.PROPERTY_MANAGER))

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Any,
    ) -> bool:
        if isinstance(obj, Property):
            property_obj = obj
        elif isinstance(obj, Unit):
            property_obj = obj.property
        else:
            unit = getattr(obj, "unit", None)
            property_obj = getattr(unit, "property", None)

        return bool(
            property_obj
            and PropertySelector.user_can_manage_property(request.user, property_obj)
        )
