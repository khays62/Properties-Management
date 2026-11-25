from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.files import File
from django.core.validators import FileExtensionValidator, MinValueValidator
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.properties.models import Unit
from common.constants import ListingStatus, PropertyStatus, UnitStatus
from common.models import BaseModel, UUIDModel


MAX_LISTING_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
ACTIVE_LISTING_STATUSES = (ListingStatus.PUBLISHED, ListingStatus.PAUSED)


def validate_listing_image_size(image: File | None) -> None:
    if image and image.size > MAX_LISTING_IMAGE_SIZE_BYTES:
        raise ValidationError(_("Image file size must not exceed 5 MB."))


class Listing(BaseModel):
    unit = models.ForeignKey(
        Unit,
        on_delete=models.PROTECT,
        related_name="listings",
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
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
    available_date = models.DateField()
    published_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=ListingStatus.choices,
        default=ListingStatus.DRAFT,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "available_date"], name="listing_status_date_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["unit"],
                condition=models.Q(status__in=ACTIVE_LISTING_STATUSES),
                name="listing_one_active_per_unit",
            ),
            models.CheckConstraint(
                condition=models.Q(rent_amount__gt=0),
                name="listing_rent_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(deposit_amount__gte=0),
                name="listing_deposit_nonnegative",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        errors = {}
        if self._state.adding and self.unit_id:
            if self.unit.status != UnitStatus.AVAILABLE:
                errors["unit"] = _("Only available units can be listed.")
            if self.unit.property.status == PropertyStatus.ARCHIVED:
                errors["unit"] = _("Archived properties cannot have listings.")
        if self.rent_amount is not None and self.rent_amount <= 0:
            errors["rent_amount"] = _("Rent amount must be greater than zero.")
        if self.deposit_amount is not None and self.deposit_amount < 0:
            errors["deposit_amount"] = _("Deposit amount cannot be negative.")
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"{self.title} ({self.unit})"


class ListingImage(UUIDModel):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.CASCADE,
        related_name="images",
    )
    image = models.ImageField(
        upload_to="listings/",
        validators=[
            FileExtensionValidator(allowed_extensions=["jpg", "jpeg", "png", "webp"]),
            validate_listing_image_size,
        ],
    )
    caption = models.CharField(max_length=255, blank=True)
    display_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["display_order", "id"]

    def __str__(self) -> str:
        return f"Image for {self.listing}"
