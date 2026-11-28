from rest_framework import serializers

from apps.properties.models import Property, Unit

from .models import (
    MAX_LISTING_IMAGE_SIZE_BYTES,
    Listing,
    ListingImage,
)


class ListingSerializer(serializers.ModelSerializer):
    unit_number = serializers.CharField(source="unit.unit_number", read_only=True)
    property_name = serializers.CharField(
        source="unit.property.name",
        read_only=True,
    )

    class Meta:
        model = Listing
        fields = (
            "id",
            "unit",
            "unit_number",
            "property_name",
            "title",
            "description",
            "rent_amount",
            "deposit_amount",
            "available_date",
            "published_at",
            "expires_at",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "published_at",
            "status",
            "created_at",
            "updated_at",
        )

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None:
            fields["unit"].read_only = True
        return fields


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ("id", "listing", "image", "caption", "display_order")
        read_only_fields = ("id",)

    def validate_image(self, image):
        extension = image.name.rsplit(".", 1)[-1].lower() if "." in image.name else ""
        if extension not in {"jpg", "jpeg", "png", "webp"}:
            raise serializers.ValidationError(
                "Only jpg, jpeg, png, and webp images are allowed."
            )
        if image.size > MAX_LISTING_IMAGE_SIZE_BYTES:
            raise serializers.ValidationError("Image file size must not exceed 5 MB.")
        return image


class ListingDetailSerializer(ListingSerializer):
    images = ListingImageSerializer(many=True, read_only=True)

    class Meta(ListingSerializer.Meta):
        fields = ListingSerializer.Meta.fields + ("images",)


class PublicListingPropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = Property
        fields = ("name", "address", "city", "country")


class PublicListingUnitSerializer(serializers.ModelSerializer):
    property = PublicListingPropertySerializer(read_only=True)

    class Meta:
        model = Unit
        fields = (
            "unit_number",
            "floor",
            "bedrooms",
            "bathrooms",
            "square_meters",
            "property",
        )


class PublicListingDetailSerializer(serializers.ModelSerializer):
    unit = PublicListingUnitSerializer(read_only=True)

    class Meta:
        model = Listing
        fields = (
            "id",
            "title",
            "description",
            "rent_amount",
            "deposit_amount",
            "available_date",
            "status",
            "unit",
        )
