from decimal import Decimal

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.leases.models import Lease
from common.constants import DepositStatus, LeaseStatus
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse
from apps.properties.services.validation import validate_model

from ..models import Deposit
from ..selectors.finance_access_selector import FinanceAccessSelector


class DepositService:
    CREATABLE_LEASE_STATUSES = (
        LeaseStatus.APPROVED,
        LeaseStatus.ACTIVE,
        LeaseStatus.EXPIRING,
    )

    @staticmethod
    def create_deposit(*, lease: Lease, created_by: User) -> Deposit:
        try:
            with transaction.atomic():
                locked_lease = (
                    Lease.objects.select_for_update()
                    .select_related("unit__property")
                    .get(pk=lease.pk)
                )
                if not FinanceAccessSelector.user_can_manage_lease(
                    user=created_by,
                    lease=locked_lease,
                ):
                    raise PermissionDeniedResponse(
                        "You cannot manage finance for this lease."
                    )
                if locked_lease.status not in DepositService.CREATABLE_LEASE_STATUSES:
                    raise ConflictErrorResponse(
                        "A deposit can only be created for an approved or active lease."
                    )
                if Deposit.objects.filter(lease=locked_lease).exists():
                    raise ConflictErrorResponse(
                        "A deposit already exists for this lease."
                    )
                required_amount = locked_lease.deposit_amount
                deposit = Deposit(
                    lease=locked_lease,
                    required_amount=required_amount,
                    paid_amount=Decimal("0.00"),
                    status=(
                        DepositStatus.PAID
                        if required_amount == 0
                        else DepositStatus.PENDING
                    ),
                )
                validate_model(deposit)
                deposit.save()
        except IntegrityError as exc:
            raise ConflictErrorResponse(
                "A deposit already exists for this lease."
            ) from exc
        return deposit

    @staticmethod
    def record_deposit_payment(
        deposit: Deposit,
        *,
        amount: Decimal,
        reference_number: str,
        payment_date=None,
        payment_method: str,
        recorded_by: User,
    ) -> Deposit:
        if amount <= 0:
            raise ValidationError({"amount": "Deposit payment must be greater than zero."})
        try:
            with transaction.atomic():
                locked_deposit = (
                    Deposit.objects.select_for_update()
                    .select_related("lease__unit__property")
                    .get(pk=deposit.pk)
                )
                if not FinanceAccessSelector.user_can_manage_lease(
                    user=recorded_by,
                    lease=locked_deposit.lease,
                ):
                    raise PermissionDeniedResponse(
                        "You cannot manage finance for this lease."
                    )
                if locked_deposit.status not in (
                    DepositStatus.PENDING,
                    DepositStatus.PARTIALLY_PAID,
                ):
                    raise ConflictErrorResponse(
                        "This deposit cannot accept further payments."
                    )
                if Deposit.objects.filter(
                    reference_number=reference_number
                ).exclude(pk=locked_deposit.pk).exists():
                    raise ConflictErrorResponse(
                        "This deposit reference number is already in use."
                    )
                new_paid_amount = locked_deposit.paid_amount + amount
                if new_paid_amount > locked_deposit.required_amount:
                    raise ValidationError(
                        {"amount": "Payment cannot exceed the remaining deposit."}
                    )
                locked_deposit.paid_amount = new_paid_amount
                locked_deposit.reference_number = reference_number
                locked_deposit.payment_date = payment_date or timezone.localdate()
                locked_deposit.payment_method = payment_method
                locked_deposit.status = (
                    DepositStatus.PAID
                    if new_paid_amount == locked_deposit.required_amount
                    else DepositStatus.PARTIALLY_PAID
                )
                validate_model(locked_deposit)
                locked_deposit.save(
                    update_fields=[
                        "paid_amount",
                        "reference_number",
                        "payment_date",
                        "payment_method",
                        "status",
                        "updated_at",
                    ]
                )
        except IntegrityError as exc:
            raise ConflictErrorResponse(
                "This deposit reference number is already in use."
            ) from exc
        return locked_deposit

    @staticmethod
    def refund_deposit(
        deposit: Deposit,
        *,
        refunded_by: User,
        amount: Decimal | None = None,
    ) -> Deposit:
        with transaction.atomic():
            locked_deposit = (
                Deposit.objects.select_for_update()
                .select_related("lease__unit__property")
                .get(pk=deposit.pk)
            )
            if not FinanceAccessSelector.user_can_manage_lease(
                user=refunded_by,
                lease=locked_deposit.lease,
            ):
                raise PermissionDeniedResponse(
                    "You cannot manage finance for this lease."
                )
            if locked_deposit.status not in (
                DepositStatus.PAID,
                DepositStatus.PARTIALLY_PAID,
                DepositStatus.PARTIALLY_REFUNDED,
            ):
                raise ConflictErrorResponse(
                    "Only collected deposits can be refunded."
                )
            refund_amount = (
                locked_deposit.paid_amount if amount is None else amount
            )
            if refund_amount <= 0 or refund_amount > locked_deposit.paid_amount:
                raise ValidationError(
                    {"amount": "Refund must be positive and cannot exceed paid amount."}
                )
            locked_deposit.paid_amount -= refund_amount
            locked_deposit.status = (
                DepositStatus.REFUNDED
                if locked_deposit.paid_amount == 0
                else DepositStatus.PARTIALLY_REFUNDED
            )
            validate_model(locked_deposit)
            locked_deposit.save(
                update_fields=["paid_amount", "status", "updated_at"]
            )
        return locked_deposit

    @staticmethod
    def forfeit_deposit(deposit: Deposit, *, forfeited_by: User) -> Deposit:
        with transaction.atomic():
            locked_deposit = (
                Deposit.objects.select_for_update()
                .select_related("lease__unit__property")
                .get(pk=deposit.pk)
            )
            if not FinanceAccessSelector.user_can_manage_lease(
                user=forfeited_by,
                lease=locked_deposit.lease,
            ):
                raise PermissionDeniedResponse(
                    "You cannot manage finance for this lease."
                )
            if locked_deposit.paid_amount <= 0 or locked_deposit.status in (
                DepositStatus.REFUNDED,
                DepositStatus.FORFEITED,
            ):
                raise ConflictErrorResponse(
                    "Only collected, non-refunded deposits can be forfeited."
                )
            locked_deposit.status = DepositStatus.FORFEITED
            validate_model(locked_deposit)
            locked_deposit.save(update_fields=["status", "updated_at"])
        return locked_deposit
