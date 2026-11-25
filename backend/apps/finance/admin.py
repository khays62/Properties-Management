from django.contrib import admin

from .models import (
    Deposit,
    Payment,
    PaymentAllocation,
    Receipt,
    RentCharge,
    RentSchedule,
)


@admin.register(Deposit)
class DepositAdmin(admin.ModelAdmin):
    list_display = (
        "lease",
        "required_amount",
        "paid_amount",
        "status",
        "payment_method",
        "payment_date",
    )
    list_filter = (
        "status",
        "payment_method",
        "payment_date",
        "lease__unit__property__city",
    )
    search_fields = (
        "reference_number",
        "lease__tenant__user__email",
        "lease__tenant__user__first_name",
        "lease__tenant__user__last_name",
        "lease__unit__unit_number",
        "lease__unit__property__name",
    )
    ordering = ("-created_at",)
    list_select_related = ("lease__tenant__user", "lease__unit__property")
    autocomplete_fields = ("lease",)
    readonly_fields = (
        "lease",
        "required_amount",
        "paid_amount",
        "reference_number",
        "payment_date",
        "payment_method",
        "status",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RentSchedule)
class RentScheduleAdmin(admin.ModelAdmin):
    list_display = ("lease", "due_day", "frequency", "is_active", "updated_at")
    list_filter = ("frequency", "is_active")
    search_fields = (
        "lease__tenant__user__email",
        "lease__unit__unit_number",
        "lease__unit__property__name",
    )
    ordering = ("lease_id",)
    autocomplete_fields = ("lease",)
    readonly_fields = (
        "lease",
        "due_day",
        "frequency",
        "is_active",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(RentCharge)
class RentChargeAdmin(admin.ModelAdmin):
    list_display = (
        "lease",
        "billing_month",
        "billing_year",
        "amount",
        "balance",
        "due_date",
        "status",
    )
    list_filter = (
        "status",
        "billing_month",
        "billing_year",
        "due_date",
        "lease__unit__property__city",
    )
    search_fields = (
        "lease__tenant__user__email",
        "lease__tenant__user__first_name",
        "lease__tenant__user__last_name",
        "lease__unit__unit_number",
        "lease__unit__property__name",
    )
    ordering = ("-billing_year", "-billing_month")
    list_select_related = ("lease__tenant__user", "lease__unit__property")
    autocomplete_fields = ("lease",)
    readonly_fields = (
        "lease",
        "billing_month",
        "billing_year",
        "amount",
        "balance",
        "due_date",
        "status",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


class PaymentAllocationInline(admin.TabularInline):
    model = PaymentAllocation
    extra = 0
    can_delete = False
    readonly_fields = ("rent_charge", "amount_allocated", "created_at")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "reference_number",
        "tenant",
        "amount",
        "payment_date",
        "payment_method",
        "status",
    )
    list_filter = ("status", "payment_method", "payment_date")
    search_fields = (
        "reference_number",
        "tenant__user__email",
        "tenant__user__first_name",
        "tenant__user__last_name",
    )
    ordering = ("-payment_date", "-created_at")
    list_select_related = ("tenant__user",)
    inlines = (PaymentAllocationInline,)
    readonly_fields = (
        "tenant",
        "amount",
        "payment_date",
        "reference_number",
        "payment_method",
        "notes",
        "status",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PaymentAllocation)
class PaymentAllocationAdmin(admin.ModelAdmin):
    list_display = ("payment", "rent_charge", "amount_allocated", "created_at")
    list_filter = ("created_at",)
    search_fields = (
        "payment__reference_number",
        "rent_charge__lease__tenant__user__email",
        "rent_charge__lease__unit__unit_number",
    )
    ordering = ("-created_at",)
    list_select_related = ("payment__tenant__user", "rent_charge__lease")
    readonly_fields = ("payment", "rent_charge", "amount_allocated", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("receipt_number", "payment", "generated_at")
    list_filter = ("generated_at",)
    search_fields = (
        "receipt_number",
        "payment__reference_number",
        "payment__tenant__user__email",
    )
    ordering = ("-generated_at",)
    list_select_related = ("payment__tenant__user",)
    readonly_fields = (
        "payment",
        "receipt_number",
        "generated_at",
        "created_at",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
