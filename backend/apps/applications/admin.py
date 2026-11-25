from django.contrib import admin

from .models import Applicant, RentalApplication, Screening


@admin.register(Applicant)
class ApplicantAdmin(admin.ModelAdmin):
    list_display = (
        "first_name",
        "last_name",
        "email",
        "phone",
        "employment_status",
        "monthly_income",
    )
    list_filter = ("employment_status",)
    search_fields = ("first_name", "last_name", "email", "phone")
    ordering = ("last_name", "first_name")
    readonly_fields = ("created_at", "updated_at")

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RentalApplication)
class RentalApplicationAdmin(admin.ModelAdmin):
    list_display = (
        "applicant",
        "listing",
        "status",
        "move_in_date",
        "submitted_at",
    )
    list_filter = ("status", "submitted_at", "listing__unit__property__city")
    search_fields = (
        "applicant__first_name",
        "applicant__last_name",
        "applicant__email",
        "listing__title",
        "listing__unit__unit_number",
        "listing__unit__property__name",
    )
    ordering = ("-submitted_at",)
    list_select_related = (
        "applicant",
        "listing",
        "listing__unit",
        "listing__unit__property",
    )
    readonly_fields = (
        "listing",
        "applicant",
        "move_in_date",
        "notes",
        "rejection_reason",
        "status",
        "submitted_at",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Screening)
class ScreeningAdmin(admin.ModelAdmin):
    list_display = (
        "application",
        "status",
        "score",
        "reviewed_by",
        "reviewed_at",
    )
    list_filter = ("status", "reviewed_at", "income_verified", "employment_verified")
    search_fields = (
        "application__applicant__first_name",
        "application__applicant__last_name",
        "application__applicant__email",
    )
    ordering = ("-created_at",)
    list_select_related = ("application", "application__applicant", "reviewed_by")
    readonly_fields = (
        "application",
        "score",
        "notes",
        "income_verified",
        "employment_verified",
        "references_checked",
        "status",
        "reviewed_by",
        "reviewed_at",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
