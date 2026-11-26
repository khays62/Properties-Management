from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import PropertyAssignment, User
from apps.properties.models import Property
from common.constants import UserRole
from common.exceptions import PermissionDeniedResponse


class PropertyAssignmentService:
    @staticmethod
    def assign_manager(
        *,
        property_obj: Property,
        manager_email: str,
        assigned_by: User,
    ) -> PropertyAssignment:
        if (
            assigned_by.role != UserRole.OWNER
            or property_obj.owner_id != assigned_by.pk
        ):
            raise PermissionDeniedResponse(
                "Only the property owner can assign its property manager."
            )

        manager = User.objects.filter(
            email__iexact=manager_email.strip(),
            role=UserRole.PROPERTY_MANAGER,
            is_active=True,
        ).first()
        if manager is None:
            raise ValidationError(
                {"manager_email": "An active Property Manager with this email is required."}
            )

        assignment, _ = PropertyAssignment.objects.update_or_create(
            property_id=property_obj.pk,
            manager=manager,
            defaults={
                "assigned_date": timezone.localdate(),
                "is_active": True,
            },
        )
        return assignment
