from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files import File
from django.core.validators import FileExtensionValidator
from django.db import models
from django.utils import timezone

from apps.accounts.models import User
from apps.leases.models import Tenant
from apps.properties.models import Unit
from common.constants import (
    MaintenanceActivityAction,
    MaintenanceCategory,
    MaintenancePriority,
    MaintenanceStatus,
    UserRole,
)
from common.models import BaseModel, UUIDModel


MAX_MAINTENANCE_ATTACHMENT_SIZE_BYTES = 5 * 1024 * 1024
MAINTENANCE_ATTACHMENT_EXTENSIONS = ("jpg", "jpeg", "png", "pdf")


def validate_maintenance_attachment_size(file: File | None) -> None:
    if file and file.size > MAX_MAINTENANCE_ATTACHMENT_SIZE_BYTES:
        raise ValidationError("Attachment size must not exceed 5 MB.")


class MaintenanceTicket(BaseModel):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="maintenance_tickets",
    )
    unit = models.ForeignKey(
        Unit,
        on_delete=models.PROTECT,
        related_name="maintenance_tickets",
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(
        max_length=16,
        choices=MaintenanceCategory.choices,
    )
    priority = models.CharField(
        max_length=16,
        choices=MaintenancePriority.choices,
        default=MaintenancePriority.MEDIUM,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="assigned_maintenance_tickets",
        null=True,
        blank=True,
    )
    resolution_notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=MaintenanceStatus.choices,
        default=MaintenanceStatus.OPEN,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["unit", "status"],
                name="maint_unit_status_idx",
            ),
            models.Index(
                fields=["tenant", "status"],
                name="maint_tenant_status_idx",
            ),
            models.Index(
                fields=["assigned_to", "status"],
                name="maint_assigned_status_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    category__in=[choice.value for choice in MaintenanceCategory]
                ),
                name="maint_ticket_category_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    priority__in=[choice.value for choice in MaintenancePriority]
                ),
                name="maint_ticket_priority_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(
                    status__in=[choice.value for choice in MaintenanceStatus]
                ),
                name="maint_ticket_status_valid",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if (
            self.assigned_to_id
            and self.assigned_to.role != UserRole.PROPERTY_MANAGER
        ):
            raise ValidationError(
                {"assigned_to": "Assigned user must be a property manager."}
            )

    def __str__(self) -> str:
        return f"{self.title} ({self.status})"


class MaintenanceAttachment(UUIDModel):
    ticket = models.ForeignKey(
        MaintenanceTicket,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(
        upload_to="maintenance/attachments/",
        validators=[
            FileExtensionValidator(
                allowed_extensions=MAINTENANCE_ATTACHMENT_EXTENSIONS
            ),
            validate_maintenance_attachment_size,
        ],
    )
    uploaded_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["uploaded_at", "id"]
        indexes = [
            models.Index(
                fields=["ticket", "uploaded_at"],
                name="maint_file_ticket_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"Attachment for ticket {self.ticket_id}"


class MaintenanceActivity(UUIDModel):
    ticket = models.ForeignKey(
        MaintenanceTicket,
        on_delete=models.CASCADE,
        related_name="activities",
    )
    action = models.CharField(
        max_length=16,
        choices=MaintenanceActivityAction.choices,
    )
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        related_name="maintenance_activities",
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(
                fields=["ticket", "created_at"],
                name="maint_activity_ticket_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    action__in=[
                        choice.value for choice in MaintenanceActivityAction
                    ]
                ),
                name="maint_activity_action_valid",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.action} on ticket {self.ticket_id}"
