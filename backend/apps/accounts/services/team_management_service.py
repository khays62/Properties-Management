from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.accounts.models import PropertyAssignment, TeamMembership, User
from apps.accounts.selectors.user_selector import UserSelector
from apps.properties.models import Property
from common.constants import UserRole
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse

from .invitation_service import InvitationService


class TeamManagementService:
    @staticmethod
    def _require_owner(owner: User) -> None:
        if owner.role != UserRole.OWNER:
            raise PermissionDeniedResponse("Only Owners can manage team members.")

    @staticmethod
    def invite_manager(
        *,
        owner: User,
        email: str,
        first_name: str = "",
        last_name: str = "",
    ):
        TeamManagementService._require_owner(owner)
        return InvitationService.create_staff_invitation(
            owner=owner,
            email=email,
            role=UserRole.PROPERTY_MANAGER,
            first_name=first_name,
            last_name=last_name,
        )

    @staticmethod
    def invite_accountant(
        *,
        owner: User,
        email: str,
        first_name: str = "",
        last_name: str = "",
    ):
        TeamManagementService._require_owner(owner)
        return InvitationService.create_staff_invitation(
            owner=owner,
            email=email,
            role=UserRole.ACCOUNTANT,
            first_name=first_name,
            last_name=last_name,
        )

    @staticmethod
    def get_team_members(
        *,
        owner: User,
        role: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ):
        TeamManagementService._require_owner(owner)
        InvitationService.expire_pending(owner=owner)
        return UserSelector.get_team_members(
            owner=owner,
            role=role,
            status=status,
            search=search,
        )

    @staticmethod
    def get_team_member(*, owner: User, user_id: str) -> User:
        TeamManagementService._require_owner(owner)
        InvitationService.expire_pending(owner=owner)
        user = UserSelector.get_team_member(owner=owner, user_id=user_id)
        if user is None:
            raise NotFound("Team member not found.")
        return user

    @staticmethod
    def deactivate_user(*, owner: User, user: User) -> TeamMembership:
        TeamManagementService._require_owner(owner)
        if user.role not in (UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT):
            raise ValidationError(
                "Only Property Managers and Accountants are team members."
            )
        with transaction.atomic():
            try:
                membership = TeamMembership.objects.select_for_update().get(
                    owner=owner,
                    user=user,
                )
            except TeamMembership.DoesNotExist as exc:
                raise NotFound("Team member not found.") from exc

            if membership.is_active:
                property_ids = Property.objects.filter(owner=owner).values("pk")
                PropertyAssignment.objects.filter(
                    manager=user,
                    property_id__in=property_ids,
                    is_active=True,
                ).update(
                    is_active=False,
                    suspended_by_membership=True,
                    updated_at=timezone.now(),
                )
                membership.is_active = False
                membership.deactivated_at = timezone.now()
                membership.save(
                    update_fields=["is_active", "deactivated_at", "updated_at"]
                )
        return membership

    @staticmethod
    def reactivate_user(*, owner: User, user: User) -> TeamMembership:
        TeamManagementService._require_owner(owner)
        if user.role not in (UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT):
            raise ValidationError(
                "Only Property Managers and Accountants are team members."
            )
        with transaction.atomic():
            try:
                membership = TeamMembership.objects.select_for_update().get(
                    owner=owner,
                    user=user,
                )
            except TeamMembership.DoesNotExist as exc:
                raise NotFound("Team member not found.") from exc

            if not user.is_active:
                raise ConflictErrorResponse(
                    "A system administrator must reactivate this account."
                )

            if not membership.is_active:
                membership.is_active = True
                membership.deactivated_at = None
                membership.save(
                    update_fields=["is_active", "deactivated_at", "updated_at"]
                )
                PropertyAssignment.objects.filter(
                    manager=user,
                    property_id__in=Property.objects.filter(owner=owner).values("pk"),
                    suspended_by_membership=True,
                ).update(
                    is_active=True,
                    suspended_by_membership=False,
                    updated_at=timezone.now(),
                )
        return membership

