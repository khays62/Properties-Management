from collections.abc import Iterable
from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from .constants import UserRole


def get_user_role(user: Any) -> str | None:
    role = getattr(user, "role", None)
    if isinstance(role, UserRole):
        return role.value
    return role if isinstance(role, str) else None


def has_role(user: Any, roles: Iterable[UserRole | str]) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False

    allowed_roles = {role.value if isinstance(role, UserRole) else role for role in roles}
    return get_user_role(user) in allowed_roles


class RolePermission(BasePermission):
    allowed_roles: tuple[UserRole | str, ...] = ()

    def has_permission(self, request: Request, view: APIView) -> bool:
        return has_role(request.user, self.allowed_roles)


class IsOwner(RolePermission):
    allowed_roles = (UserRole.OWNER,)


class IsPropertyManager(RolePermission):
    allowed_roles = (UserRole.PROPERTY_MANAGER,)


class IsTenant(RolePermission):
    allowed_roles = (UserRole.TENANT,)


class IsAccountant(RolePermission):
    allowed_roles = (UserRole.ACCOUNTANT,)
