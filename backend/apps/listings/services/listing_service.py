from typing import Any

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.properties.models import Unit
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import ListingStatus, PropertyStatus, UnitStatus
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse

from ..models import ACTIVE_LISTING_STATUSES, Listing


class ListingService:
    @staticmethod
    def create_listing(*, created_by: User, unit: Unit, **listing_data: Any) -> Listing:
        try:
            with transaction.atomic():
                locked_unit = (
                    Unit.objects.select_for_update()
                    .select_related("property")
                    .get(pk=unit.pk)
                )
                if not PropertySelector.user_can_manage_property(
                    created_by,
                    locked_unit.property,
                ):
                    raise PermissionDeniedResponse(
                        "You do not have permission to create listings for this property."
                    )
                if locked_unit.status != UnitStatus.AVAILABLE:
                    raise ConflictErrorResponse("Only available units can be listed.")
                if locked_unit.property.status == PropertyStatus.ARCHIVED:
                    raise ConflictErrorResponse(
                        "Archived properties cannot have listings."
                    )

                listing = Listing(
                    unit=locked_unit,
                    status=ListingStatus.DRAFT,
                    **listing_data,
                )
                ListingService._validate(listing)
                listing.save()
        except IntegrityError as exc:
            raise ConflictErrorResponse(
                "An active listing already exists for this unit."
            ) from exc
        return listing

    @staticmethod
    def publish_listing(listing: Listing) -> Listing:
        with transaction.atomic():
            listing, unit = ListingService._lock_listing(listing)
            if listing.status not in (ListingStatus.DRAFT, ListingStatus.PAUSED):
                raise ConflictErrorResponse(
                    "Only draft or paused listings can be published."
                )
            if unit.property.status == PropertyStatus.ARCHIVED:
                raise ConflictErrorResponse(
                    "Archived properties cannot have published listings."
                )
            if Listing.objects.filter(
                unit=unit,
                status__in=ACTIVE_LISTING_STATUSES,
            ).exclude(pk=listing.pk).exists():
                raise ConflictErrorResponse(
                    "This unit already has an active listing."
                )

            if listing.status == ListingStatus.DRAFT:
                if unit.status != UnitStatus.AVAILABLE:
                    raise ConflictErrorResponse(
                        "Only available units can be published."
                    )
                unit.status = UnitStatus.LISTED
                unit.save(update_fields=["status", "updated_at"])
            elif unit.status != UnitStatus.LISTED:
                raise ConflictErrorResponse(
                    "A paused listing must have a listed unit to be published."
                )

            listing.status = ListingStatus.PUBLISHED
            if listing.published_at is None:
                listing.published_at = timezone.now()
            listing.save(update_fields=["status", "published_at", "updated_at"])
        return listing

    @staticmethod
    def pause_listing(listing: Listing) -> Listing:
        with transaction.atomic():
            listing, unit = ListingService._lock_listing(listing)
            if listing.status != ListingStatus.PUBLISHED:
                raise ConflictErrorResponse("Only published listings can be paused.")
            if unit.status != UnitStatus.LISTED:
                raise ConflictErrorResponse(
                    "A published listing must have a listed unit to be paused."
                )

            listing.status = ListingStatus.PAUSED
            listing.save(update_fields=["status", "updated_at"])
        return listing

    @staticmethod
    def close_listing(listing: Listing) -> Listing:
        with transaction.atomic():
            listing, unit = ListingService._lock_listing(listing)
            if listing.status != ListingStatus.PUBLISHED:
                raise ConflictErrorResponse("Only published listings can be closed.")
            if unit.status != UnitStatus.LISTED:
                raise ConflictErrorResponse(
                    "A published listing must have a listed unit to be closed."
                )

            listing.status = ListingStatus.CLOSED
            listing.save(update_fields=["status", "updated_at"])
            unit.status = UnitStatus.AVAILABLE
            unit.save(update_fields=["status", "updated_at"])
        return listing

    @staticmethod
    def expire_listing(listing: Listing) -> Listing:
        with transaction.atomic():
            listing, unit = ListingService._lock_listing(listing)
            if listing.status not in ACTIVE_LISTING_STATUSES:
                raise ConflictErrorResponse(
                    "Only published or paused listings can be expired."
                )
            if unit.status != UnitStatus.LISTED:
                raise ConflictErrorResponse(
                    "An active listing must have a listed unit to be expired."
                )

            listing.status = ListingStatus.EXPIRED
            listing.save(update_fields=["status", "updated_at"])
            unit.status = UnitStatus.AVAILABLE
            unit.save(update_fields=["status", "updated_at"])
        return listing

    @staticmethod
    def _lock_listing(listing: Listing) -> tuple[Listing, Unit]:
        locked_listing = Listing.objects.select_for_update().get(pk=listing.pk)
        locked_unit = (
            Unit.objects.select_for_update()
            .select_related("property")
            .get(pk=locked_listing.unit_id)
        )
        return locked_listing, locked_unit

    @staticmethod
    def _validate(listing: Listing) -> None:
        try:
            listing.full_clean()
        except DjangoValidationError as exc:
            detail = exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            raise ValidationError(detail) from exc
