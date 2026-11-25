from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.audit.services.audit_log_service import AuditContext, AuditLogService
from apps.leases.models import Tenant
from apps.notifications.services.notification_service import NotificationService
from apps.properties.services.validation import validate_model
from common.constants import (
    AuditAction,
    NotificationType,
    PaymentStatus,
    RentChargeStatus,
)
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse

from ..models import Payment, PaymentAllocation, RentCharge
from ..selectors.finance_access_selector import FinanceAccessSelector
from ..selectors.payment_selector import PaymentSelector
from .receipt_service import ReceiptService


class PaymentService:
    @staticmethod
    def create_payment(
        *,
        created_by: User,
        tenant: Tenant,
        amount: Decimal,
        payment_date,
        reference_number: str,
        payment_method: str,
        notes: str = "",
        audit_context: AuditContext | None = None,
    ) -> Payment:
        if not PaymentSelector.user_can_manage_tenant(
            user=created_by,
            tenant_id=tenant.pk,
        ):
            raise PermissionDeniedResponse(
                "You cannot manage payments for this tenant."
            )
        if Payment.objects.filter(reference_number=reference_number).exists():
            raise ConflictErrorResponse(
                "This payment reference number is already in use."
            )
        payment = Payment(
            tenant=tenant,
            amount=amount,
            payment_date=payment_date,
            reference_number=reference_number,
            payment_method=payment_method,
            notes=notes,
            status=PaymentStatus.PENDING,
        )
        validate_model(payment)
        try:
            with transaction.atomic():
                payment.save()
                AuditLogService.log_action(
                    user=created_by,
                    action=AuditAction.PAYMENT_CREATED,
                    model_name="Payment",
                    object_id=str(payment.pk),
                    new_data={
                        "amount": str(payment.amount),
                        "reference_number": payment.reference_number,
                        "payment_method": payment.payment_method,
                        "status": payment.status,
                    },
                    context=audit_context,
                )
                NotificationService.create_notification(
                    user=tenant.user,
                    title="Payment recorded",
                    message=(
                        f"Payment {payment.reference_number} for "
                        f"{payment.amount} was recorded."
                    ),
                    type=NotificationType.PAYMENT,
                )
        except IntegrityError as exc:
            raise ConflictErrorResponse(
                "This payment reference number is already in use."
            ) from exc
        return payment

    @staticmethod
    def allocate_payment(
        payment: Payment,
        *,
        allocations: list[dict],
        allocated_by: User,
    ) -> Payment:
        if not allocations:
            raise ValidationError(
                {"allocations": "At least one rent charge allocation is required."}
            )
        with transaction.atomic():
            locked_payment = (
                Payment.objects.select_for_update()
                .select_related("tenant")
                .get(pk=payment.pk)
            )
            if not PaymentSelector.user_can_manage_tenant(
                user=allocated_by,
                tenant_id=locked_payment.tenant_id,
            ):
                raise PermissionDeniedResponse(
                    "You cannot manage payments for this tenant."
                )
            if locked_payment.status != PaymentStatus.PENDING:
                raise ConflictErrorResponse(
                    "Only pending payments can be allocated."
                )

            allocation_by_charge = {}
            for entry in allocations:
                charge = entry["rent_charge"]
                if charge.pk in allocation_by_charge:
                    raise ValidationError(
                        {
                            "allocations": (
                                "Each rent charge may appear only once per payment."
                            )
                        }
                    )
                allocation_by_charge[charge.pk] = entry["amount_allocated"]

            total_allocated = sum(
                allocation_by_charge.values(),
                Decimal("0.00"),
            )
            if total_allocated != locked_payment.amount:
                raise ValidationError(
                    {
                        "allocations": (
                            "Allocations must equal the payment amount."
                        )
                    }
                )

            locked_charges = {
                charge.pk: charge
                for charge in RentCharge.objects.select_for_update()
                .select_related("lease", "lease__unit__property")
                .filter(pk__in=allocation_by_charge)
                .order_by("pk")
            }
            if len(locked_charges) != len(allocation_by_charge):
                raise ValidationError(
                    {"allocations": "One or more rent charges do not exist."}
                )

            validated_allocations = []
            for charge_id, amount_allocated in allocation_by_charge.items():
                charge = locked_charges[charge_id]
                if charge.lease.tenant_id != locked_payment.tenant_id:
                    raise ValidationError(
                        {
                            "allocations": (
                                "Payments can only be allocated to the tenant's "
                                "rent charges."
                            )
                        }
                    )
                if not FinanceAccessSelector.user_can_manage_lease(
                    user=allocated_by,
                    lease=charge.lease,
                ):
                    raise PermissionDeniedResponse(
                        "You cannot manage finance for one or more rent charges."
                    )
                if charge.status == RentChargeStatus.CANCELLED:
                    raise ConflictErrorResponse(
                        "Cancelled rent charges cannot receive allocations."
                    )
                if amount_allocated <= 0 or amount_allocated > charge.balance:
                    raise ValidationError(
                        {
                            "allocations": (
                                "An allocation must be positive and cannot exceed "
                                "the rent charge's remaining balance."
                            )
                        }
                    )
                allocation = PaymentAllocation(
                    payment=locked_payment,
                    rent_charge=charge,
                    amount_allocated=amount_allocated,
                )
                validate_model(allocation)
                validated_allocations.append((allocation, charge))

            today = timezone.localdate()
            for allocation, charge in validated_allocations:
                allocation.save()
                charge.balance -= allocation.amount_allocated
                if charge.balance == 0:
                    charge.status = RentChargeStatus.PAID
                elif charge.due_date < today:
                    charge.status = RentChargeStatus.OVERDUE
                else:
                    charge.status = RentChargeStatus.PARTIALLY_PAID
                charge.save(update_fields=["balance", "status", "updated_at"])

            locked_payment.status = PaymentStatus.COMPLETED
            locked_payment.save(update_fields=["status", "updated_at"])
            ReceiptService.generate_receipt(locked_payment)
        return locked_payment

    @staticmethod
    def reverse_payment(
        payment: Payment,
        *,
        reversed_by: User,
        audit_context: AuditContext | None = None,
    ) -> Payment:
        with transaction.atomic():
            locked_payment = (
                Payment.objects.select_for_update()
                .select_related("tenant")
                .get(pk=payment.pk)
            )
            if not PaymentSelector.user_can_manage_tenant(
                user=reversed_by,
                tenant_id=locked_payment.tenant_id,
            ):
                raise PermissionDeniedResponse(
                    "You cannot manage payments for this tenant."
                )
            if locked_payment.status != PaymentStatus.COMPLETED:
                raise ConflictErrorResponse(
                    "Only completed payments can be reversed."
                )

            allocations = list(
                PaymentAllocation.objects.filter(payment=locked_payment)
                .values("rent_charge_id", "amount_allocated")
                .order_by("rent_charge_id")
            )
            charge_ids = [entry["rent_charge_id"] for entry in allocations]
            charges = {
                charge.pk: charge
                for charge in RentCharge.objects.select_for_update()
                .select_related("lease", "lease__unit__property")
                .filter(pk__in=charge_ids)
                .order_by("pk")
            }
            today = timezone.localdate()
            for entry in allocations:
                charge = charges[entry["rent_charge_id"]]
                if not FinanceAccessSelector.user_can_manage_lease(
                    user=reversed_by,
                    lease=charge.lease,
                ):
                    raise PermissionDeniedResponse(
                        "You cannot manage finance for one or more rent charges."
                    )
                charge.balance += entry["amount_allocated"]
                if charge.balance > charge.amount:
                    raise ConflictErrorResponse(
                        "Reversing this payment would exceed the original charge."
                    )
                if charge.balance == 0:
                    charge.status = RentChargeStatus.PAID
                elif charge.due_date < today:
                    charge.status = RentChargeStatus.OVERDUE
                elif charge.balance == charge.amount:
                    charge.status = RentChargeStatus.PENDING
                else:
                    charge.status = RentChargeStatus.PARTIALLY_PAID
                charge.save(update_fields=["balance", "status", "updated_at"])

            old_status = locked_payment.status
            locked_payment.status = PaymentStatus.REVERSED
            locked_payment.save(update_fields=["status", "updated_at"])
            AuditLogService.log_action(
                user=reversed_by,
                action=AuditAction.PAYMENT_REVERSED,
                model_name="Payment",
                object_id=str(locked_payment.pk),
                old_data={"status": old_status},
                new_data={"status": locked_payment.status},
                context=audit_context,
            )
            NotificationService.create_notification(
                user=locked_payment.tenant.user,
                title="Payment reversed",
                message=(
                    f"Payment {locked_payment.reference_number} was reversed."
                ),
                type=NotificationType.PAYMENT,
            )
        return locked_payment
