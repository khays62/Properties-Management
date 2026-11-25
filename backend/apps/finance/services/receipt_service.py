from uuid import uuid4

from django.db import transaction
from rest_framework.exceptions import ValidationError

from common.constants import PaymentStatus
from common.exceptions import ConflictErrorResponse

from ..models import Payment, Receipt


class ReceiptService:
    @staticmethod
    def generate_receipt(payment: Payment) -> Receipt:
        with transaction.atomic():
            locked_payment = Payment.objects.select_for_update().get(
                pk=payment.pk
            )
            if locked_payment.status != PaymentStatus.COMPLETED:
                raise ConflictErrorResponse(
                    "A receipt can only be generated for a completed payment."
                )
            receipt, _ = Receipt.objects.get_or_create(
                payment=locked_payment,
                defaults={
                    "receipt_number": f"RCP-{uuid4().hex.upper()}",
                },
            )
        return receipt
