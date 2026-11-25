from typing import Any

from django.db import IntegrityError, transaction

from common.constants import PropertyStatus, UserRole
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse
from common.permissions import get_user_role

from apps.accounts.models import User

from ..models import Property
from .validation import validate_model


class PropertyService:
    @staticmethod
    def create_property(*, owner: User, **property_data: Any) -> Property:
        if get_user_role(owner) != UserRole.OWNER:
            raise PermissionDeniedResponse(
                "Only users with the Owner role can create properties."
            )

        property_obj = Property(owner=owner, **property_data)
        validate_model(property_obj)
        try:
            with transaction.atomic():
                property_obj.save()
        except IntegrityError as exc:
            raise ConflictErrorResponse(
                "A property with this code already exists."
            ) from exc
        return property_obj

    @staticmethod
    def archive_property(property_obj: Property) -> Property:
        with transaction.atomic():
            locked_property = Property.objects.select_for_update().get(
                pk=property_obj.pk
            )
            if locked_property.status != PropertyStatus.ACTIVE:
                raise ConflictErrorResponse("Only active properties can be archived.")

            locked_property.status = PropertyStatus.ARCHIVED
            locked_property.save(update_fields=["status", "updated_at"])
        return locked_property
