from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from django.db import transaction

from apps.properties.models import Property
from common.constants import UserRole

from .forms import UserChangeForm, UserCreationForm
from .models import (
    PropertyAssignment,
    TeamInvitation,
    TeamMembership,
    User,
    UserProfile,
)


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    ordering = ("email",)
    list_display = ("email", "first_name", "last_name", "role", "is_active", "is_staff")
    list_filter = ("role", "is_active", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "phone_number", "role")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "password1", "password2", "role", "is_staff", "is_superuser"),
            },
        ),
    )
    readonly_fields = ("created_at", "updated_at")
    filter_horizontal = ("groups", "user_permissions")


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "city", "country")
    search_fields = ("user__email", "city", "country")


@admin.register(PropertyAssignment)
class PropertyAssignmentAdmin(admin.ModelAdmin):
    list_display = ("property_id", "manager", "assigned_date", "is_active")
    list_filter = ("is_active", "assigned_date")
    search_fields = ("property_id", "manager__email")

    def save_model(self, request, obj, form, change):
        with transaction.atomic():
            super().save_model(request, obj, form, change)
            property_obj = Property.objects.get(pk=obj.property_id)
            if obj.manager.role == UserRole.PROPERTY_MANAGER:
                TeamMembership.objects.get_or_create(
                    owner=property_obj.owner,
                    user=obj.manager,
                )


@admin.register(TeamMembership)
class TeamMembershipAdmin(admin.ModelAdmin):
    list_display = ("owner", "user", "is_active", "deactivated_at")
    list_filter = ("is_active",)
    search_fields = ("owner__email", "user__email")


@admin.register(TeamInvitation)
class TeamInvitationAdmin(admin.ModelAdmin):
    list_display = ("email", "role", "invited_by", "status", "expires_at")
    list_filter = ("role", "status")
    search_fields = ("email", "invited_by__email", "user__email")
    readonly_fields = (
        "email",
        "role",
        "user",
        "invited_by",
        "status",
        "token_hash",
        "expires_at",
        "accepted_at",
        "created_at",
        "updated_at",
    )
