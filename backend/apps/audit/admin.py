from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = (
        "action",
        "model_name",
        "object_id",
        "user",
        "ip_address",
        "created_at",
    )
    list_filter = ("action", "model_name", "created_at")
    search_fields = (
        "action",
        "model_name",
        "object_id",
        "user__email",
        "user_agent",
    )
    ordering = ("-created_at",)
    list_select_related = ("user",)
    readonly_fields = (
        "user",
        "action",
        "model_name",
        "object_id",
        "old_data",
        "new_data",
        "ip_address",
        "user_agent",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_view_permission(self, request, obj=None):
        return bool(
            request.user.is_active
            and request.user.is_staff
        )

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
