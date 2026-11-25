from typing import Any

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.leases.models import Lease, Tenant
from apps.properties.models import Unit
from apps.properties.selectors.property_selector import PropertySelector
from apps.properties.services.validation import validate_model
from common.constants import (
    LeaseStatus,
    MaintenanceActivityAction,
    MaintenanceStatus,
    UnitStatus,
    UserRole,
)
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse
from common.permissions import get_user_role

from ..models import MaintenanceActivity, MaintenanceTicket
from ..selectors.maintenance_selector import MaintenanceSelector


MANAGER_ROLES = (UserRole.OWNER, UserRole.PROPERTY_MANAGER)


class MaintenanceService:
    EDITABLE_TICKET_FIELDS = frozenset(
        {"title", "description", "category", "priority"}
    )

    @staticmethod
    def create_ticket(
        *,
        created_by: User,
        unit: Unit,
        tenant: Tenant | None = None,
        **ticket_data: Any,
    ) -> MaintenanceTicket:
        role = get_user_role(created_by)
        with transaction.atomic():
            locked_unit = Unit.objects.select_for_update().select_related(
                "property"
            ).get(pk=unit.pk)

            if role == UserRole.TENANT:
                tenant_profile = Tenant.objects.filter(user=created_by).first()
                if tenant_profile is None:
                    raise PermissionDeniedResponse(
                        "A tenant profile is required to create a maintenance ticket."
                    )
                if tenant is not None and tenant.pk != tenant_profile.pk:
                    raise PermissionDeniedResponse(
                        "Tenants can only create tickets for themselves."
                    )
                tenant = tenant_profile
                today = timezone.localdate()
                if (
                    locked_unit.status != UnitStatus.OCCUPIED
                    or not Lease.objects.filter(
                        tenant=tenant,
                        unit=locked_unit,
                        status=LeaseStatus.ACTIVE,
                        start_date__lte=today,
                        end_date__gte=today,
                    ).exists()
                ):
                    raise ValidationError(
                        {
                            "unit": (
                                "Tickets can only be created for a unit occupied "
                                "under the tenant's active lease."
                            )
                        }
                    )
            elif role in {role.value for role in MANAGER_ROLES}:
                if not PropertySelector.user_can_manage_property(
                    created_by,
                    locked_unit.property,
                ):
                    raise PermissionDeniedResponse(
                        "You cannot create tickets for this property's units."
                    )
                if tenant is None or not Lease.objects.filter(
                    tenant=tenant,
                    unit=locked_unit,
                ).exists():
                    raise ValidationError(
                        {"tenant": "The tenant must have a lease for this unit."}
                    )
            else:
                raise PermissionDeniedResponse(
                    "You do not have permission to create maintenance tickets."
                )

            ticket = MaintenanceTicket(
                tenant=tenant,
                unit=locked_unit,
                status=MaintenanceStatus.OPEN,
                **ticket_data,
            )
            validate_model(ticket)
            ticket.save()
            MaintenanceService._record_activity(
                ticket=ticket,
                action=MaintenanceActivityAction.CREATED,
                performed_by=created_by,
                notes="Maintenance ticket created.",
            )
        return ticket

    @staticmethod
    def update_ticket(
        ticket: MaintenanceTicket,
        *,
        updated_by: User,
        **changes: Any,
    ) -> MaintenanceTicket:
        if not changes:
            raise ValidationError("Provide at least one field to update.")
        if not set(changes).issubset(MaintenanceService.EDITABLE_TICKET_FIELDS):
            raise ValidationError("Only ticket details can be updated.")
        with transaction.atomic():
            locked_ticket = MaintenanceService._lock_ticket(ticket)
            MaintenanceService._require_manager_access(
                locked_ticket,
                updated_by,
            )
            for field, value in changes.items():
                setattr(locked_ticket, field, value)
            validate_model(locked_ticket)
            locked_ticket.save(update_fields=[*changes.keys(), "updated_at"])
            MaintenanceService._record_activity(
                ticket=locked_ticket,
                action=MaintenanceActivityAction.UPDATED,
                performed_by=updated_by,
                notes="Maintenance ticket details updated.",
            )
        return locked_ticket

    @staticmethod
    def assign_ticket(
        ticket: MaintenanceTicket,
        *,
        assigned_to: User,
        assigned_by: User,
        notes: str = "",
    ) -> MaintenanceTicket:
        with transaction.atomic():
            locked_ticket = MaintenanceService._lock_ticket(ticket)
            MaintenanceService._require_manager_access(
                locked_ticket,
                assigned_by,
            )
            if locked_ticket.status != MaintenanceStatus.OPEN:
                raise ConflictErrorResponse("Only open tickets can be assigned.")
            if assigned_to.role != UserRole.PROPERTY_MANAGER:
                raise ValidationError(
                    {"assigned_to": "Assigned user must be a property manager."}
                )
            if not PropertySelector.user_can_manage_property(
                assigned_to,
                locked_ticket.unit.property,
            ):
                raise ValidationError(
                    {"assigned_to": "The manager is not assigned to this property."}
                )

            locked_ticket.assigned_to = assigned_to
            locked_ticket.status = MaintenanceStatus.ASSIGNED
            locked_ticket.save(
                update_fields=["assigned_to", "status", "updated_at"]
            )
            MaintenanceService._record_activity(
                ticket=locked_ticket,
                action=MaintenanceActivityAction.ASSIGNED,
                performed_by=assigned_by,
                notes=notes or f"Assigned to {assigned_to.email}.",
            )
        return locked_ticket

    @staticmethod
    def start_work(
        ticket: MaintenanceTicket,
        *,
        started_by: User,
        notes: str = "",
    ) -> MaintenanceTicket:
        with transaction.atomic():
            locked_ticket = MaintenanceService._lock_ticket(ticket)
            MaintenanceService._require_manager_access(locked_ticket, started_by)
            if locked_ticket.status != MaintenanceStatus.ASSIGNED:
                raise ConflictErrorResponse(
                    "Only assigned tickets can be moved to in progress."
                )
            locked_ticket.status = MaintenanceStatus.IN_PROGRESS
            locked_ticket.save(update_fields=["status", "updated_at"])
            MaintenanceService._record_activity(
                ticket=locked_ticket,
                action=MaintenanceActivityAction.STARTED,
                performed_by=started_by,
                notes=notes or "Work started.",
            )
        return locked_ticket

    @staticmethod
    def resolve_ticket(
        ticket: MaintenanceTicket,
        *,
        resolved_by: User,
        resolution_notes: str,
    ) -> MaintenanceTicket:
        notes = resolution_notes.strip()
        if not notes:
            raise ValidationError(
                {"resolution_notes": "Resolution notes are required."}
            )
        with transaction.atomic():
            locked_ticket = MaintenanceService._lock_ticket(ticket)
            MaintenanceService._require_manager_access(
                locked_ticket,
                resolved_by,
            )
            if locked_ticket.status != MaintenanceStatus.IN_PROGRESS:
                raise ConflictErrorResponse(
                    "Only in-progress tickets can be resolved."
                )
            locked_ticket.status = MaintenanceStatus.RESOLVED
            locked_ticket.resolution_notes = notes
            locked_ticket.save(
                update_fields=["status", "resolution_notes", "updated_at"]
            )
            MaintenanceService._record_activity(
                ticket=locked_ticket,
                action=MaintenanceActivityAction.RESOLVED,
                performed_by=resolved_by,
                notes=notes,
            )
        return locked_ticket

    @staticmethod
    def close_ticket(
        ticket: MaintenanceTicket,
        *,
        closed_by: User,
        notes: str = "",
    ) -> MaintenanceTicket:
        with transaction.atomic():
            locked_ticket = MaintenanceService._lock_ticket(ticket)
            MaintenanceService._require_manager_access(locked_ticket, closed_by)
            if locked_ticket.status != MaintenanceStatus.RESOLVED:
                raise ConflictErrorResponse(
                    "Only resolved tickets can be closed."
                )
            locked_ticket.status = MaintenanceStatus.CLOSED
            locked_ticket.save(update_fields=["status", "updated_at"])
            MaintenanceService._record_activity(
                ticket=locked_ticket,
                action=MaintenanceActivityAction.CLOSED,
                performed_by=closed_by,
                notes=notes or "Ticket closed.",
            )
        return locked_ticket

    @staticmethod
    def cancel_ticket(
        ticket: MaintenanceTicket,
        *,
        cancelled_by: User,
        notes: str = "",
    ) -> MaintenanceTicket:
        with transaction.atomic():
            locked_ticket = MaintenanceService._lock_ticket(ticket)
            if get_user_role(cancelled_by) == UserRole.TENANT:
                if locked_ticket.tenant.user_id != cancelled_by.pk:
                    raise PermissionDeniedResponse(
                        "Tenants can only cancel their own tickets."
                    )
            else:
                MaintenanceService._require_manager_access(
                    locked_ticket,
                    cancelled_by,
                )
            if locked_ticket.status != MaintenanceStatus.OPEN:
                raise ConflictErrorResponse("Only open tickets can be cancelled.")
            locked_ticket.status = MaintenanceStatus.CANCELLED
            locked_ticket.save(update_fields=["status", "updated_at"])
            MaintenanceService._record_activity(
                ticket=locked_ticket,
                action=MaintenanceActivityAction.CANCELLED,
                performed_by=cancelled_by,
                notes=notes or "Ticket cancelled.",
            )
        return locked_ticket

    @staticmethod
    def _lock_ticket(ticket: MaintenanceTicket) -> MaintenanceTicket:
        return MaintenanceTicket.objects.select_for_update().get(pk=ticket.pk)

    @staticmethod
    def _require_manager_access(
        ticket: MaintenanceTicket,
        user: User,
    ) -> None:
        if (
            get_user_role(user) not in {role.value for role in MANAGER_ROLES}
            or not MaintenanceSelector.user_can_access_ticket(
                user=user,
                ticket=ticket,
            )
        ):
            raise PermissionDeniedResponse(
                "You cannot manage tickets for this property."
            )

    @staticmethod
    def _record_activity(
        *,
        ticket: MaintenanceTicket,
        action: MaintenanceActivityAction,
        performed_by: User,
        notes: str,
    ) -> MaintenanceActivity:
        return MaintenanceActivity.objects.create(
            ticket=ticket,
            action=action,
            performed_by=performed_by,
            notes=notes,
        )
