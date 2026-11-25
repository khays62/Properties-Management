from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models

from common.constants import AuditAction
from common.models import BaseModel


class AuditLogQuerySet(models.QuerySet):
    def update(self, **kwargs):
        raise ValidationError("Audit logs are immutable.")

    def delete(self):
        raise ValidationError("Audit logs are immutable.")


class AuditLogManager(models.Manager.from_queryset(AuditLogQuerySet)):
    pass


class AuditLog(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="audit_logs",
        null=True,
        blank=True,
    )
    action = models.CharField(max_length=32, choices=AuditAction.choices)
    model_name = models.CharField(max_length=100)
    object_id = models.CharField(max_length=64)
    old_data = models.JSONField(null=True, blank=True)
    new_data = models.JSONField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    objects = AuditLogManager()

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["action", "created_at"],
                name="audit_action_date_idx",
            ),
            models.Index(
                fields=["model_name", "object_id", "created_at"],
                name="audit_model_obj_date_idx",
            ),
            models.Index(
                fields=["user", "created_at"],
                name="audit_user_date_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(
                    action__in=[choice.value for choice in AuditAction]
                ),
                name="audit_action_valid",
            ),
        ]

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ValidationError("Audit logs are immutable.")
        return super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("Audit logs are immutable.")

    def __str__(self) -> str:
        return f"{self.action}: {self.model_name} {self.object_id}"
