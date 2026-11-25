from typing import Any

from django.db import IntegrityError, transaction

from apps.accounts.models import User
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse

from ..models import Property, Unit
from ..selectors.property_selector import PropertySelector
from .validation import validate_model


class UnitService:
    @staticmethod
    def create_unit(
        *,
        created_by: User,
        property: Property,
        **unit_data: Any,
    ) -> Unit:
        if not PropertySelector.user_can_manage_property(created_by, property):
            raise PermissionDeniedResponse(
                "You do not have permission to add units to this property."
            )

        unit = Unit(property=property, **unit_data)
        validate_model(unit)
        try:
            with transaction.atomic():
                unit.save()
        except IntegrityError as exc:
            raise ConflictErrorResponse(
                "A unit with this number already exists for the property."
            ) from exc
        return unit
