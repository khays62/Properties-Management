import hashlib
import hmac
import secrets
from datetime import timedelta
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import NotFound, ValidationError

from apps.accounts.models import TeamInvitation, TeamMembership, User
from apps.accounts.selectors.invitation_selector import InvitationSelector
from common.constants import TeamInvitationStatus, UserRole
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse


TEAM_ROLES = (UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)


class InvitationService:
    @staticmethod
    def _require_owner(owner: User) -> None:
        if owner.role != UserRole.OWNER:
            raise PermissionDeniedResponse("Only Owners can manage team invitations.")

    @staticmethod
    def create_staff_invitation(
        *,
        owner: User,
        email: str,
        role: str,
        first_name: str = "",
        last_name: str = "",
    ):
        InvitationService._require_owner(owner)
        if role not in TEAM_ROLES:
            raise ValidationError(
                {"role": "Only Property Manager and Accountant invitations are allowed."}
            )

        normalized_email = email.strip().lower()
        with transaction.atomic():
            existing_user = (
                User.objects.select_for_update()
                .filter(email__iexact=normalized_email)
                .first()
            )
            if existing_user is not None:
                if existing_user.role not in TEAM_ROLES:
                    raise ValidationError(
                        {"email": "This email belongs to an account that cannot join a team."}
                    )
                if existing_user.role != role:
                    raise ValidationError(
                        {"role": "The existing account has a different role."}
                    )
                if not existing_user.is_active:
                    raise ValidationError(
                        {"email": "The existing account is inactive."}
                    )

                membership, created = TeamMembership.objects.get_or_create(
                    owner=owner,
                    user=existing_user,
                )
                if not created:
                    raise ConflictErrorResponse(
                        "This user already has a team membership."
                    )
                membership.full_clean()
                invitation = TeamInvitation(
                    email=existing_user.email,
                    role=role,
                    user=existing_user,
                    invited_by=owner,
                    status=TeamInvitationStatus.ACCEPTED,
                    accepted_at=timezone.now(),
                )
                invitation.full_clean()
                invitation.save()
                return invitation, False

            try:
                with transaction.atomic():
                    user = User.objects.create_user(
                        email=normalized_email,
                        password=None,
                        role=role,
                        is_active=True,
                        first_name=first_name.strip(),
                        last_name=last_name.strip(),
                    )
            except IntegrityError as exc:
                raise ConflictErrorResponse(
                    "An account with this email was created concurrently. Retry the invitation."
                ) from exc

            membership = TeamMembership(owner=owner, user=user)
            membership.full_clean()
            membership.save()
            raw_token = secrets.token_urlsafe(32)
            invitation = TeamInvitation(
                email=user.email,
                role=role,
                user=user,
                invited_by=owner,
                status=TeamInvitationStatus.PENDING,
                token_hash=InvitationService._token_hash(raw_token),
                expires_at=InvitationService._expiry_time(),
            )
            invitation.full_clean()
            invitation.save()
            InvitationService._send_invitation(invitation, raw_token)
        return invitation, True

    @staticmethod
    def resend_invitation(*, owner: User, invitation_id: str) -> TeamInvitation:
        InvitationService._require_owner(owner)
        with transaction.atomic():
            invitation = InvitationSelector.get_owner_invitations(
                owner=owner
            ).select_for_update().filter(pk=invitation_id).first()
            if invitation is None:
                raise NotFound("Invitation not found.")
            if invitation.status not in (
                TeamInvitationStatus.PENDING,
                TeamInvitationStatus.EXPIRED,
            ):
                raise ConflictErrorResponse(
                    "Only pending or expired invitations can be resent."
                )
            if not invitation.user.is_active:
                raise ConflictErrorResponse(
                    "A system administrator must reactivate this account first."
                )
            if (
                invitation.user.role != invitation.role
                or invitation.email.casefold()
                != invitation.user.email.casefold()
            ):
                raise ConflictErrorResponse(
                    "The invited account no longer matches this invitation."
                )
            membership = TeamMembership.objects.filter(
                owner=owner,
                user=invitation.user,
                is_active=True,
            ).exists()
            if not membership:
                raise ConflictErrorResponse(
                    "Reactivate the team membership before resending this invitation."
                )

            raw_token = secrets.token_urlsafe(32)
            invitation.status = TeamInvitationStatus.PENDING
            invitation.token_hash = InvitationService._token_hash(raw_token)
            invitation.expires_at = InvitationService._expiry_time()
            invitation.save(
                update_fields=[
                    "status",
                    "token_hash",
                    "expires_at",
                    "updated_at",
                ]
            )
            InvitationService._send_invitation(invitation, raw_token)
        return invitation

    @staticmethod
    def revoke_invitation(*, owner: User, invitation_id: str) -> TeamInvitation:
        InvitationService._require_owner(owner)
        with transaction.atomic():
            invitation = InvitationSelector.get_owner_invitations(
                owner=owner
            ).select_for_update().filter(pk=invitation_id).first()
            if invitation is None:
                raise NotFound("Invitation not found.")
            if invitation.status not in (
                TeamInvitationStatus.PENDING,
                TeamInvitationStatus.EXPIRED,
            ):
                raise ConflictErrorResponse(
                    "Only pending or expired invitations can be revoked."
                )
            invitation.status = TeamInvitationStatus.REVOKED
            invitation.token_hash = None
            invitation.save(
                update_fields=["status", "token_hash", "updated_at"]
            )
            from .team_management_service import TeamManagementService

            TeamManagementService.deactivate_user(
                owner=owner,
                user=invitation.user,
            )
        return invitation

    @staticmethod
    def accept_invitation(
        *,
        invitation_id: str,
        token: str,
        new_password: str,
    ) -> TeamInvitation:
        expired = False
        invitation = None
        now = timezone.now()
        with transaction.atomic():
            invitation = (
                TeamInvitation.objects.select_for_update()
                .select_related("user", "invited_by")
                .filter(pk=invitation_id)
                .first()
            )
            if invitation is None:
                raise ValidationError(
                    {"token": "This invitation is invalid or expired."}
                )
            if (
                invitation.status == TeamInvitationStatus.PENDING
                and (
                    invitation.expires_at is None
                    or invitation.expires_at <= now
                )
            ):
                invitation.status = TeamInvitationStatus.EXPIRED
                invitation.save(update_fields=["status", "updated_at"])
                expired = True
            elif (
                invitation.status != TeamInvitationStatus.PENDING
                or not invitation.token_hash
                or not hmac.compare_digest(
                    invitation.token_hash,
                    InvitationService._token_hash(token),
                )
            ):
                raise ValidationError(
                    {"token": "This invitation is invalid or expired."}
                )
            elif not invitation.user.is_active:
                raise ValidationError(
                    {"token": "This invitation is invalid or expired."}
                )
            elif (
                invitation.user.role != invitation.role
                or invitation.user.role not in TEAM_ROLES
                or invitation.email.casefold()
                != invitation.user.email.casefold()
            ):
                raise ValidationError(
                    {"token": "This invitation is invalid or expired."}
                )
            else:
                membership = TeamMembership.objects.select_for_update().filter(
                    owner=invitation.invited_by,
                    user=invitation.user,
                    is_active=True,
                ).exists()
                if not membership:
                    raise ValidationError(
                        {"token": "This invitation is invalid or expired."}
                    )
                try:
                    validate_password(new_password, user=invitation.user)
                except DjangoValidationError as exc:
                    raise ValidationError({"new_password": exc.messages}) from exc

                invitation.user.set_password(new_password)
                invitation.user.save(update_fields=["password", "updated_at"])
                invitation.status = TeamInvitationStatus.ACCEPTED
                invitation.accepted_at = now
                invitation.token_hash = None
                invitation.save(
                    update_fields=[
                        "status",
                        "accepted_at",
                        "token_hash",
                        "updated_at",
                    ]
                )

        if expired:
            raise ValidationError({"token": "This invitation is invalid or expired."})
        return invitation

    @staticmethod
    def expire_pending(*, owner: User | None = None) -> int:
        queryset = TeamInvitation.objects.filter(
            status=TeamInvitationStatus.PENDING,
            expires_at__lte=timezone.now(),
        )
        if owner is not None:
            queryset = queryset.filter(invited_by=owner)
        return queryset.update(
            status=TeamInvitationStatus.EXPIRED,
            updated_at=timezone.now(),
        )

    @staticmethod
    def _expiry_time():
        return timezone.now() + timedelta(
            seconds=settings.PASSWORD_RESET_TIMEOUT
        )

    @staticmethod
    def _token_hash(token: str) -> str:
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    @staticmethod
    def _send_invitation(invitation: TeamInvitation, raw_token: str) -> None:
        query = urlencode(
            {
                "invitation": str(invitation.pk),
                "token": raw_token,
            }
        )
        setup_url = (
            f"{settings.FRONTEND_BASE_URL}/team/accept-invitation/?{query}"
        )
        message = (
            f"You have been invited to join an OmniProperties team as "
            f"{invitation.get_role_display()}.\n\n"
            "Set your password and accept the invitation using this secure link:\n"
            f"{setup_url}\n\n"
            f"This link expires in {settings.PASSWORD_RESET_TIMEOUT // 3600} hours. "
            "If you did not expect this invitation, you can ignore this message."
        )
        sent = send_mail(
            subject="Your OmniProperties team invitation",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invitation.email],
            fail_silently=False,
        )
        if sent != 1:
            raise RuntimeError("Team invitation email was not sent.")
