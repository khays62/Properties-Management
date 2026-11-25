from django.contrib import admin

from .models import Lease, LeaseStatusHistory, RenewalAlert, Tenant


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "status",
        "occupation",
        "emergency_contact_name",
        "updated_at",
    )
    list_filter = ("status",)
    search_fields = ("user__email", "user__first_name", "user__last_name")
    ordering = ("user__last_name", "user__first_name")
    readonly_fields = ("user", "status", "created_at", "updated_at")


class LeaseStatusHistoryInline(admin.TabularInline):
    model = LeaseStatusHistory
    extra = 0
    can_delete = False
    readonly_fields = (
        "old_status",
        "new_status",
        "changed_by",
        "change_reason",
        "created_at",
    )

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Lease)
class LeaseAdmin(admin.ModelAdmin):
    list_display = (
        "unit",
        "tenant",
        "start_date",
        "end_date",
        "monthly_rent",
        "status",
        "approved_by",
    )
    list_filter = ("status", "start_date", "end_date", "unit__property__city")
    search_fields = (
        "tenant__user__email",
        "tenant__user__first_name",
        "tenant__user__last_name",
        "unit__unit_number",
        "unit__property__name",
        "application__applicant__email",
    )
    ordering = ("-start_date",)
    list_select_related = ("tenant__user", "unit__property", "application")
    autocomplete_fields = ("tenant", "unit", "application", "approved_by")
    readonly_fields = (
        "tenant",
        "unit",
        "application",
        "start_date",
        "end_date",
        "monthly_rent",
        "deposit_amount",
        "payment_due_day",
        "status",
        "approved_by",
        "approved_at",
        "notes",
        "created_at",
        "updated_at",
    )
    inlines = (LeaseStatusHistoryInline,)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return request.user.has_perm("leases.view_lease")


@admin.register(LeaseStatusHistory)
class LeaseStatusHistoryAdmin(admin.ModelAdmin):
    list_display = (
        "lease",
        "old_status",
        "new_status",
        "changed_by",
        "created_at",
    )
    list_filter = ("old_status", "new_status", "created_at")
    search_fields = ("lease__unit__unit_number", "lease__tenant__user__email")
    ordering = ("-created_at",)
    readonly_fields = (
        "lease",
        "old_status",
        "new_status",
        "changed_by",
        "change_reason",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RenewalAlert)
class RenewalAlertAdmin(admin.ModelAdmin):
    list_display = (
        "lease",
        "alert_date",
        "days_before_expiry",
        "status",
        "updated_at",
    )
    list_filter = ("status", "days_before_expiry", "alert_date")
    search_fields = (
        "lease__tenant__user__email",
        "lease__unit__unit_number",
        "lease__unit__property__name",
    )
    ordering = ("alert_date", "days_before_expiry")
    autocomplete_fields = ("lease",)
    readonly_fields = (
        "lease",
        "alert_date",
        "days_before_expiry",
        "status",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
