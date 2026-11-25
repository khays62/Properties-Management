from django.conf import settings
from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from common.constants import UserRole
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
