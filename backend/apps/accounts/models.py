from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from common.constants import TeamInvitationStatus, UserRole
from common.models import BaseModel

from .managers import UserManager


class User(BaseModel, AbstractBaseUser, PermissionsMixin):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    phone_number = models.CharField(max_length=32, blank=True)
    role = models.CharField(
        max_length=32,
        choices=UserRole.choices,
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        ordering = ["email"]

    def __str__(self) -> str:
        return self.email


class UserProfile(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    avatar = models.ImageField(upload_to="accounts/avatars/", blank=True)
    address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    emergency_contact = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["user__email"]

    def __str__(self) -> str:
        return f"Profile for {self.user.email}"


class PropertyAssignment(BaseModel):
    property_id = models.UUIDField()
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="property_assignments",
    )
    assigned_date = models.DateField(default=timezone.localdate)
    is_active = models.BooleanField(default=True)
    suspended_by_membership = models.BooleanField(default=False)

    class Meta:
        ordering = ["-assigned_date"]
        indexes = [
            models.Index(
                fields=["property_id", "is_active"],
                name="acct_property_active_idx",
            ),
            models.Index(
                fields=["manager", "is_active"],
                name="acct_manager_active_idx",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if self.manager_id and self.manager.role != UserRole.PROPERTY_MANAGER:
            raise ValidationError(
                {"manager": "Assigned user must have the Property Manager role."}
            )

    def __str__(self) -> str:
        return f"{self.property_id} managed by {self.manager.email}"


class TeamMembership(BaseModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="owned_team_memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="team_memberships",
    )
    is_active = models.BooleanField(default=True)
    deactivated_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["user__email"]
        constraints = [
            models.UniqueConstraint(
                fields=["owner", "user"],
                name="tm_owner_user_uniq",
            ),
        ]
        indexes = [
            models.Index(
                fields=["owner", "is_active"],
                name="tm_owner_active_idx",
            ),
            models.Index(
                fields=["user", "is_active"],
                name="tm_user_active_idx",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        errors = {}
        if self.owner_id and self.owner.role != UserRole.OWNER:
            errors["owner"] = "Team membership owner must have the Owner role."
        if self.user_id and self.user.role not in (
            UserRole.PROPERTY_MANAGER,
            UserRole.ACCOUNTANT,
        ):
            errors["user"] = (
                "Team members must be Property Managers or Accountants."
            )
        if self.owner_id and self.owner_id == self.user_id:
            errors["user"] = "An Owner cannot be a member of their own team."
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"{self.user.email} in {self.owner.email}'s team"


class TeamInvitation(BaseModel):
    email = models.EmailField()
    role = models.CharField(max_length=32, choices=UserRole.choices)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="team_invitations",
    )
    invited_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="team_invitations_sent",
    )
    status = models.CharField(
        max_length=16,
        choices=TeamInvitationStatus.choices,
        default=TeamInvitationStatus.PENDING,
    )
    token_hash = models.CharField(max_length=64, unique=True, null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    role__in=(UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT)
                ),
                name="team_invite_role_allowed",
            ),
            models.UniqueConstraint(
                fields=["invited_by", "user"],
                condition=models.Q(status=TeamInvitationStatus.PENDING),
                name="tm_inv_owner_user_pend_uniq",
            ),
        ]
        indexes = [
            models.Index(
                fields=["invited_by", "status", "created_at"],
                name="team_invite_owner_status_idx",
            ),
            models.Index(
                fields=["email", "status"],
                name="team_invite_email_status_idx",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        errors = {}
        if self.invited_by_id and self.invited_by.role != UserRole.OWNER:
            errors["invited_by"] = "Only an Owner can invite team members."
        if self.user_id and self.user.role != self.role:
            errors["user"] = "Invitation role must match the invited user's role."
        if self.user_id and self.email.casefold() != self.user.email.casefold():
            errors["email"] = "Invitation email must match the invited user's email."
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"{self.email} ({self.status})"
