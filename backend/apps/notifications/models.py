from django.conf import settings
from django.db import models

from common.constants import NotificationType
from common.models import BaseModel


class Notification(BaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=16, choices=NotificationType.choices)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["user", "is_read", "created_at"],
                name="notif_user_read_date_idx",
            ),
            models.Index(
                fields=["user", "type", "created_at"],
                name="notif_user_type_date_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.user_id})"
