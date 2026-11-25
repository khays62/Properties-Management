from django.core.files import File
from django.db import transaction
from rest_framework.exceptions import PermissionDenied

from apps.accounts.models import User
from apps.properties.services.validation import validate_model

from ..models import MaintenanceAttachment, MaintenanceTicket
from ..selectors.maintenance_selector import MaintenanceSelector


class MaintenanceAttachmentService:
    @staticmethod
    def upload_attachment(
        *,
        ticket: MaintenanceTicket,
        file: File,
        uploaded_by: User,
    ) -> MaintenanceAttachment:
        if not MaintenanceSelector.user_can_access_ticket(
            user=uploaded_by,
            ticket=ticket,
        ):
            raise PermissionDenied(
                "You cannot upload attachments to this maintenance ticket."
            )
        attachment = MaintenanceAttachment(ticket=ticket, file=file)
        validate_model(attachment)
        with transaction.atomic():
            attachment.save()
        return attachment
