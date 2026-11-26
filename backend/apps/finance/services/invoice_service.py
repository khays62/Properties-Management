from django.db import IntegrityError, transaction
from django.utils import timezone

from apps.finance.models import Invoice, RentCharge
from apps.properties.services.validation import validate_model


class InvoiceService:
    @staticmethod
    def issue_invoice(
        *,
        rent_charge: RentCharge,
        issued_date=None,
    ) -> Invoice:
        existing = Invoice.objects.filter(rent_charge=rent_charge).first()
        if existing is not None:
            return existing

        invoice = Invoice(
            rent_charge=rent_charge,
            invoice_number=f"INV-{rent_charge.pk.hex[:16].upper()}",
            issued_date=issued_date or timezone.localdate(),
        )
        try:
            with transaction.atomic():
                validate_model(invoice)
                invoice.save()
        except IntegrityError:
            existing = Invoice.objects.filter(rent_charge=rent_charge).first()
            if existing is not None:
                return existing
            raise
        return invoice
