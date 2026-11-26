from rest_framework import serializers

from apps.accounts.models import PropertyAssignment

from .models import (
    MAX_UNIT_IMAGE_SIZE_BYTES,
    Property,
    Unit,
    UnitImage,
)


class AssignPropertyManagerSerializer(serializers.Serializer):
    manager_email = serializers.EmailField()


class PropertyAssignmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyAssignment
        fields = ("id", "property_id", "manager", "assigned_date", "is_active")
        read_only_fields = fields


class PropertySerializer(serializers.ModelSerializer):
    unit_count = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = (
            "id",
            "owner",
            "name",
            "code",
            "description",
            "address",
            "city",
            "country",
            "status",
            "unit_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "owner", "status", "created_at", "updated_at")

    def get_unit_count(self, obj: Property) -> int:
        if hasattr(obj, "unit_count"):
            return obj.unit_count
        return obj.units.count()


class UnitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Unit
        fields = (
            "id",
            "property",
            "unit_number",
            "floor",
            "bedrooms",
            "bathrooms",
            "square_meters",
            "rent_amount",
            "deposit_amount",
            "description",
            "status",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def validate(self, attrs):
        instance = self.instance
        values = {
            field: attrs.get(field, getattr(instance, field, None))
            for field in ("rent_amount", "deposit_amount", "bedrooms", "bathrooms")
        }
        errors = {}
        if values["rent_amount"] is not None and values["rent_amount"] <= 0:
            errors["rent_amount"] = "Rent amount must be greater than zero."
        if values["deposit_amount"] is not None and values["deposit_amount"] < 0:
            errors["deposit_amount"] = "Deposit amount cannot be negative."
        if values["bedrooms"] is not None and values["bedrooms"] < 0:
            errors["bedrooms"] = "Bedrooms cannot be negative."
        if values["bathrooms"] is not None and values["bathrooms"] < 0:
            errors["bathrooms"] = "Bathrooms cannot be negative."
        if errors:
            raise serializers.ValidationError(errors)
        return attrs


class UnitImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnitImage
        fields = ("id", "unit", "image", "caption", "display_order")
        read_only_fields = ("id",)

    def validate_image(self, image):
        extension = image.name.rsplit(".", 1)[-1].lower() if "." in image.name else ""
        if extension not in {"jpg", "jpeg", "png", "webp"}:
            raise serializers.ValidationError(
                "Only jpg, jpeg, png, and webp images are allowed."
            )
        if image.size > MAX_UNIT_IMAGE_SIZE_BYTES:
            raise serializers.ValidationError("Image file size must not exceed 5 MB.")
        return image


class PropertyDetailSerializer(PropertySerializer):
    units = UnitSerializer(many=True, read_only=True)

    class Meta(PropertySerializer.Meta):
        fields = PropertySerializer.Meta.fields + ("units",)


class UnitDetailSerializer(UnitSerializer):
    images = UnitImageSerializer(many=True, read_only=True)

    class Meta(UnitSerializer.Meta):
        fields = UnitSerializer.Meta.fields + ("images",)
