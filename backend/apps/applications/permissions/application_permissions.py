from typing import Any

from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.applications.models import Applicant, RentalApplication, Screening
from common.constants import UserRole
from common.permissions import has_role

from ..selectors.applicant_selector import ApplicantSelector
from ..selectors.application_selector import ApplicationSelector


class CanManageApplications(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        if getattr(view, "action", None) == "create":
            return True
        return has_role(
            request.user,
            (UserRole.OWNER, UserRole.PROPERTY_MANAGER),
        )

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Any,
    ) -> bool:
        user: User = request.user
        if isinstance(obj, RentalApplication):
            return ApplicationSelector.user_can_manage_application(user, obj)
        if isinstance(obj, Applicant):
            return ApplicantSelector.get_queryset(user=user).filter(
                pk=obj.pk
            ).exists()
        return False


class CanManageScreening(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        return has_role(
            request.user,
            (UserRole.OWNER, UserRole.PROPERTY_MANAGER),
        )

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Screening,
    ) -> bool:
        return ApplicationSelector.user_can_manage_application(
            request.user,
            obj.application,
        )
