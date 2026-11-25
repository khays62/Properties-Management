from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from common.constants import UserRole
from common.permissions import has_role

from ..models import Listing
from ..selectors.listing_selector import ListingSelector


class CanManageListings(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        return has_role(request.user, (UserRole.OWNER, UserRole.PROPERTY_MANAGER))

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Any,
    ) -> bool:
        listing = obj if isinstance(obj, Listing) else getattr(obj, "listing", None)
        return bool(
            listing
            and ListingSelector.user_can_manage_listing(request.user, listing)
        )
