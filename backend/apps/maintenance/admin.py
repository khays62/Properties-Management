from django.contrib import admin

from .models import (
    MaintenanceActivity,
    MaintenanceAttachment,
    MaintenanceTicket,
)


class MaintenanceActivityInline(admin.TabularInline):
    model = MaintenanceActivity
    extra = 0
    can_delete = False
    readonly_fields = ("action", "performed_by", "notes", "created_at")

    def has_add_permission(self, request, obj=None):
        return False


class MaintenanceAttachmentInline(admin.TabularInline):
    model = MaintenanceAttachment
    extra = 0
    can_delete = False
    readonly_fields = ("file", "uploaded_at")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(MaintenanceTicket)
class MaintenanceTicketAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "status",
        "priority",
        "category",
        "tenant",
        "unit",
        "assigned_to",
        "created_at",
    )
    list_filter = (
        "status",
        "priority",
        "category",
        "unit__property__city",
        "created_at",
    )
    search_fields = (
        "title",
        "description",
        "tenant__user__email",
        "tenant__user__first_name",
        "tenant__user__last_name",
        "unit__unit_number",
        "unit__property__name",
    )
    ordering = ("-created_at",)
    list_select_related = (
        "tenant__user",
        "unit__property",
        "assigned_to",
    )
    readonly_fields = (
        "tenant",
        "unit",
        "title",
        "description",
        "category",
        "priority",
        "assigned_to",
        "resolution_notes",
        "status",
        "created_at",
        "updated_at",
    )
    inlines = (MaintenanceAttachmentInline, MaintenanceActivityInline)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(MaintenanceAttachment)
class MaintenanceAttachmentAdmin(admin.ModelAdmin):
    list_display = ("ticket", "file", "uploaded_at")
    list_filter = ("uploaded_at",)
    search_fields = (
        "ticket__title",
        "ticket__tenant__user__email",
        "ticket__unit__unit_number",
    )
    ordering = ("-uploaded_at",)
    list_select_related = ("ticket",)
    readonly_fields = ("ticket", "file", "uploaded_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(MaintenanceActivity)
class MaintenanceActivityAdmin(admin.ModelAdmin):
    list_display = ("ticket", "action", "performed_by", "created_at")
    list_filter = ("action", "created_at")
    search_fields = (
        "ticket__title",
        "performed_by__email",
        "notes",
    )
    ordering = ("-created_at",)
    list_select_related = ("ticket", "performed_by")
    readonly_fields = ("ticket", "action", "performed_by", "notes", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
