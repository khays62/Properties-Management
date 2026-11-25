from django.contrib import admin

from .models import Property, Unit, UnitImage


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ("name", "code", "owner", "city", "country", "status")
    list_filter = ("status", "city", "country")
    search_fields = ("name", "code", "city", "country", "owner__email")
    ordering = ("name",)
    autocomplete_fields = ("owner",)


@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = (
        "unit_number",
        "property",
        "floor",
        "bedrooms",
        "bathrooms",
        "rent_amount",
        "status",
        "is_active",
    )
    list_filter = ("status", "is_active", "floor")
    search_fields = ("unit_number", "property__name", "property__code")
    ordering = ("property__name", "unit_number")
    autocomplete_fields = ("property",)


@admin.register(UnitImage)
class UnitImageAdmin(admin.ModelAdmin):
    list_display = ("unit", "caption", "display_order")
    search_fields = ("unit__unit_number", "unit__property__name", "caption")
    ordering = ("unit", "display_order")
    autocomplete_fields = ("unit",)
