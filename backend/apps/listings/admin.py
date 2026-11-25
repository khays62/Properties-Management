from django.contrib import admin

from .models import Listing, ListingImage


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "unit",
        "rent_amount",
        "available_date",
        "status",
        "published_at",
        "expires_at",
    )
    list_filter = ("status", "available_date", "unit__property__city")
    search_fields = (
        "title",
        "unit__unit_number",
        "unit__property__name",
        "unit__property__city",
    )
    ordering = ("-created_at",)
    autocomplete_fields = ("unit",)
    readonly_fields = ("status", "published_at")

    def get_readonly_fields(self, request, obj=None):
        readonly_fields = list(super().get_readonly_fields(request, obj))
        if obj is not None:
            readonly_fields.append("unit")
        return tuple(readonly_fields)


@admin.register(ListingImage)
class ListingImageAdmin(admin.ModelAdmin):
    list_display = ("listing", "caption", "display_order")
    search_fields = ("listing__title", "listing__unit__unit_number", "caption")
    ordering = ("listing", "display_order")
    autocomplete_fields = ("listing",)
