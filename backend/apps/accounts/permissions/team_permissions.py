from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.accounts.models import TeamInvitation, TeamMembership, User
from common.constants import UserRole
from common.permissions import has_role


class CanManageTeam(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        return has_role(request.user, (UserRole.OWNER,))

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: User | TeamInvitation,
    ) -> bool:
        if isinstance(obj, TeamInvitation):
            return obj.invited_by_id == request.user.pk
        if isinstance(obj, User):
            return TeamMembership.objects.filter(
                owner=request.user,
                user=obj,
            ).exists()
        return False
