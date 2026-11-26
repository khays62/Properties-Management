from typing import Any

from django.db import IntegrityError, transaction

from apps.accounts.models import User
from apps.audit.services.audit_log_service import AuditContext, AuditLogService
from common.constants import AuditAction, PropertyStatus, UserRole
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse
from common.permissions import get_user_role

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
    def archive_property(
        property_obj: Property,
        *,
        archived_by: User | None = None,
        audit_context: AuditContext | None = None,
    ) -> Property:
        with transaction.atomic():
            locked_property = Property.objects.select_for_update().get(
                pk=property_obj.pk
            )
            if locked_property.status != PropertyStatus.ACTIVE:
                raise ConflictErrorResponse("Only active properties can be archived.")

            unit_count = locked_property.units.count()
            if unit_count:
                raise ConflictErrorResponse(
                    "This property cannot be archived while it has associated "
                    f"units ({unit_count}) or dependent listings, applications, "
                    "leases, maintenance records, or financial records."
                )

            old_status = locked_property.status
            locked_property.status = PropertyStatus.ARCHIVED
            locked_property.save(update_fields=["status", "updated_at"])
            AuditLogService.log_action(
                user=archived_by,
                action=AuditAction.PROPERTY_ARCHIVED,
                model_name="Property",
                object_id=str(locked_property.pk),
                old_data={"status": old_status},
                new_data={"status": locked_property.status},
                context=audit_context,
            )
        return locked_property
