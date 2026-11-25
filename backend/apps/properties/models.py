from decimal import Decimal

from django.conf import settings
from django.core.files import File
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from common.constants import PropertyStatus, UnitStatus, UserRole
from common.models import BaseModel, UUIDModel


MAX_UNIT_IMAGE_SIZE_BYTES = 5 * 1024 * 1024


def validate_unit_image_size(image: File | None) -> None:
    if image and image.size > MAX_UNIT_IMAGE_SIZE_BYTES:
        raise ValidationError(_("Image file size must not exceed 5 MB."))


class Property(BaseModel):
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="properties",
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    status = models.CharField(
        max_length=16,
        choices=PropertyStatus.choices,
        default=PropertyStatus.ACTIVE,
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["name"], name="prop_name_idx"),
            models.Index(fields=["code"], name="prop_code_idx"),
            models.Index(fields=["status"], name="prop_status_idx"),
            models.Index(fields=["city"], name="prop_city_idx"),
        ]
        constraints = [
            models.UniqueConstraint(fields=["code"], name="prop_code_unique"),
        ]

    def clean(self) -> None:
        super().clean()
        if self.owner_id and self.owner.role != UserRole.OWNER:
            raise ValidationError(
                {"owner": _("A property's owner must have the Owner role.")}
            )

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"


class Unit(BaseModel):
    property = models.ForeignKey(
        Property,
        on_delete=models.PROTECT,
        related_name="units",
    )
    unit_number = models.CharField(max_length=50)
    floor = models.IntegerField()
    bedrooms = models.IntegerField(validators=[MinValueValidator(0)])
    bathrooms = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    square_meters = models.DecimalField(max_digits=10, decimal_places=2)
    rent_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    deposit_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=UnitStatus.choices,
        default=UnitStatus.AVAILABLE,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["property__name", "unit_number"]
        indexes = [
            models.Index(
                fields=["property", "status"],
                name="unit_property_status_idx",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["property", "unit_number"],
                name="unit_property_number_unique",
            ),
            models.CheckConstraint(
                condition=models.Q(bedrooms__gte=0),
                name="unit_bedrooms_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(bathrooms__gte=0),
                name="unit_bathrooms_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(rent_amount__gt=0),
                name="unit_rent_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(deposit_amount__gte=0),
                name="unit_deposit_nonnegative",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        errors = {}
        if self.rent_amount is not None and self.rent_amount <= 0:
            errors["rent_amount"] = _("Rent amount must be greater than zero.")
        if self.deposit_amount is not None and self.deposit_amount < 0:
            errors["deposit_amount"] = _("Deposit amount cannot be negative.")
        if self.bedrooms is not None and self.bedrooms < 0:
            errors["bedrooms"] = _("Bedrooms cannot be negative.")
        if self.bathrooms is not None and self.bathrooms < 0:
            errors["bathrooms"] = _("Bathrooms cannot be negative.")
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"{self.property.code} / {self.unit_number}"


class UnitImage(UUIDModel):
    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(
        upload_to="properties/units/",
        validators=[
            FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"]),
            validate_unit_image_size,
        ],
    )
    caption = models.CharField(max_length=255, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self) -> str:
        return f"Image for {self.unit}"
