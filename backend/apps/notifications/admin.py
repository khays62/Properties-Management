from django.contrib import admin

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "type", "is_read", "created_at")
    list_filter = ("type", "is_read", "created_at")
    search_fields = ("title", "message", "user__email")
    ordering = ("-created_at",)
    list_select_related = ("user",)
    readonly_fields = (
        "user",
        "title",
        "message",
        "type",
        "is_read",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
