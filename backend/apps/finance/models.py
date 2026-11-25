from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from common.constants import (
    DepositStatus,
    PaymentMethod,
    PaymentStatus,
    RentChargeStatus,
    RentFrequency,
)
from common.models import BaseModel


class Deposit(BaseModel):
    lease = models.OneToOneField(
        "leases.Lease",
        on_delete=models.PROTECT,
        related_name="deposit",
    )
    required_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    reference_number = models.CharField(
        max_length=100,
        unique=True,
        null=True,
        blank=True,
    )
    payment_date = models.DateField(null=True, blank=True)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        null=True,
        blank=True,
    )
    status = models.CharField(
        max_length=24,
        choices=DepositStatus.choices,
        default=DepositStatus.PENDING,
    )

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "payment_date"],
                name="deposit_status_date_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(required_amount__gte=0),
                name="deposit_required_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(paid_amount__gte=0),
                name="deposit_paid_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(paid_amount__lte=models.F("required_amount")),
                name="deposit_paid_within_required",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        errors = {}
        if self.lease_id and self.required_amount != self.lease.deposit_amount:
            errors["required_amount"] = (
                "Required deposit must match the lease deposit amount."
            )
        if (
            self.required_amount is not None
            and self.paid_amount is not None
            and self.paid_amount > self.required_amount
        ):
            errors["paid_amount"] = (
                "Paid deposit amount cannot exceed the required amount."
            )
        if self.paid_amount is not None and self.paid_amount > 0:
            if not self.reference_number:
                errors["reference_number"] = (
                    "A reference number is required for a deposit payment."
                )
            if self.payment_date is None:
                errors["payment_date"] = "A payment date is required."
            if self.payment_method is None:
                errors["payment_method"] = "A payment method is required."

        if self.required_amount is not None and self.paid_amount is not None:
            if self.status == DepositStatus.PENDING and self.paid_amount != 0:
                errors["status"] = "Pending deposits cannot have a paid amount."
            elif self.status == DepositStatus.PARTIALLY_PAID and not (
                0 < self.paid_amount < self.required_amount
            ):
                errors["status"] = (
                    "Partially paid deposits must have a balance due."
                )
            elif (
                self.status == DepositStatus.PAID
                and self.paid_amount != self.required_amount
            ):
                errors["status"] = "Paid deposits must be paid in full."
            elif self.status == DepositStatus.PARTIALLY_REFUNDED and not (
                0 < self.paid_amount < self.required_amount
            ):
                errors["status"] = (
                    "Partially refunded deposits must have a remaining balance."
                )
            elif self.status == DepositStatus.REFUNDED and self.paid_amount != 0:
                errors["status"] = "Refunded deposits cannot have a paid balance."
            elif self.status == DepositStatus.FORFEITED and self.paid_amount <= 0:
                errors["status"] = "Only collected deposits can be forfeited."
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"Deposit for lease {self.lease_id}"


class RentSchedule(BaseModel):
    lease = models.OneToOneField(
        "leases.Lease",
        on_delete=models.PROTECT,
        related_name="rent_schedule",
    )
    due_day = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(31)],
    )
    frequency = models.CharField(
        max_length=16,
        choices=RentFrequency.choices,
        default=RentFrequency.MONTHLY,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["lease_id"]
        indexes = [
            models.Index(
                fields=["is_active", "frequency"],
                name="rent_schedule_active_freq_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(due_day__gte=1, due_day__lte=31),
                name="rent_schedule_due_day_range",
            ),
            models.CheckConstraint(
                condition=models.Q(frequency=RentFrequency.MONTHLY),
                name="rent_schedule_monthly_only",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        errors = {}
        if self.due_day is not None and not 1 <= self.due_day <= 31:
            errors["due_day"] = "Due day must be between 1 and 31."
        if self.lease_id and self.due_day != self.lease.payment_due_day:
            errors["due_day"] = "Schedule due day must match the lease due day."
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"Monthly rent schedule for lease {self.lease_id}"


class RentCharge(BaseModel):
    lease = models.ForeignKey(
        "leases.Lease",
        on_delete=models.PROTECT,
        related_name="rent_charges",
    )
    billing_month = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(12)],
    )
    billing_year = models.PositiveSmallIntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(9999),
        ],
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    due_date = models.DateField()
    status = models.CharField(
        max_length=20,
        choices=RentChargeStatus.choices,
        default=RentChargeStatus.PENDING,
    )

    class Meta:
        ordering = ["-billing_year", "-billing_month", "lease_id"]
        indexes = [
            models.Index(
                fields=["status", "due_date"],
                name="rent_charge_status_due_idx",
            ),
            models.Index(
                fields=["lease", "billing_year", "billing_month"],
                name="rent_charge_lease_period_idx",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["lease", "billing_month", "billing_year"],
                name="rent_charge_lease_month_unique",
            ),
            models.CheckConstraint(
                condition=models.Q(billing_month__gte=1, billing_month__lte=12),
                name="rent_charge_month_range",
            ),
            models.CheckConstraint(
                condition=models.Q(billing_year__gte=1),
                name="rent_charge_year_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="rent_charge_amount_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(balance__gte=0, balance__lte=models.F("amount")),
                name="rent_charge_balance_range",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        errors = {}
        if self.amount is not None and self.amount <= Decimal("0.00"):
            errors["amount"] = "Rent charge amount must be greater than zero."
        if self.balance is not None and self.balance < Decimal("0.00"):
            errors["balance"] = "Rent charge balance cannot be negative."
        if (
            self.amount is not None
            and self.balance is not None
            and self.balance > self.amount
        ):
            errors["balance"] = "Rent charge balance cannot exceed its amount."
        if self._state.adding and self.amount is not None:
            if self.balance not in (None, Decimal("0.00"), self.amount):
                errors["balance"] = (
                    "A new rent charge balance must start equal to its amount."
                )
            elif self.balance in (None, Decimal("0.00")):
                self.balance = self.amount
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"{self.lease_id}: {self.billing_month:02d}/{self.billing_year}"


class Payment(BaseModel):
    tenant = models.ForeignKey(
        "leases.Tenant",
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    payment_date = models.DateField()
    reference_number = models.CharField(max_length=100, unique=True)
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
    )
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
    )

    class Meta:
        ordering = ["-payment_date", "-created_at"]
        indexes = [
            models.Index(
                fields=["tenant", "status", "payment_date"],
                name="payment_tenant_status_date_idx",
            ),
            models.Index(
                fields=["status", "payment_method"],
                name="payment_status_method_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(amount__gt=0),
                name="payment_amount_positive",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        if self.amount is not None and self.amount <= Decimal("0.00"):
            raise ValidationError(
                {"amount": "Payment amount must be greater than zero."}
            )

    def __str__(self) -> str:
        return f"{self.reference_number} - {self.amount}"


class PaymentAllocation(BaseModel):
    payment = models.ForeignKey(
        Payment,
        on_delete=models.PROTECT,
        related_name="allocations",
    )
    rent_charge = models.ForeignKey(
        RentCharge,
        on_delete=models.PROTECT,
        related_name="allocations",
    )
    amount_allocated = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(
                fields=["rent_charge", "created_at"],
                name="allocation_charge_date_idx",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["payment", "rent_charge"],
                name="allocation_payment_charge_unique",
            ),
            models.CheckConstraint(
                condition=models.Q(amount_allocated__gt=0),
                name="allocation_amount_positive",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        errors = {}
        if self.amount_allocated is not None and self.amount_allocated <= 0:
            errors["amount_allocated"] = (
                "Allocated amount must be greater than zero."
            )
        if self.payment_id and self.rent_charge_id:
            if self.payment.tenant_id != self.rent_charge.lease.tenant_id:
                errors["rent_charge"] = (
                    "Payments can only be allocated to the tenant's rent charges."
                )
            existing_allocations = PaymentAllocation.objects.filter(
                payment_id=self.payment_id
            )
            if self.pk:
                existing_allocations = existing_allocations.exclude(pk=self.pk)
            already_allocated = sum(
                existing_allocations.values_list("amount_allocated", flat=True),
                Decimal("0.00"),
            )
            if (
                self.amount_allocated is not None
                and already_allocated + self.amount_allocated > self.payment.amount
            ):
                errors["amount_allocated"] = (
                    "Allocations cannot exceed the payment amount."
                )
            if (
                self.amount_allocated is not None
                and self.amount_allocated > self.rent_charge.balance
            ):
                errors["amount_allocated"] = (
                    "Allocation cannot exceed the rent charge's remaining balance."
                )
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"{self.amount_allocated} from {self.payment_id} to {self.rent_charge_id}"


class Receipt(BaseModel):
    payment = models.OneToOneField(
        Payment,
        on_delete=models.PROTECT,
        related_name="receipt",
    )
    receipt_number = models.CharField(max_length=40, unique=True)
    generated_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["-generated_at"]
        indexes = [
            models.Index(fields=["generated_at"], name="receipt_generated_idx"),
        ]

    def __str__(self) -> str:
        return self.receipt_number
