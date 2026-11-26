"""Permissions for the properties application."""
from .property_permissions import (
    CanAssignPropertyManager,
    CanManageProperty,
    CanManageUnit,
)

__all__ = ["CanAssignPropertyManager", "CanManageProperty", "CanManageUnit"]
