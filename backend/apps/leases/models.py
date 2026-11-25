from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from common.constants import (
    ApplicationStatus,
    LeaseStatus,
    RenewalAlertStatus,
    TenantStatus,
)
from common.models import BaseModel, UUIDModel


ACTIVE_LEASE_STATUSES = (
    LeaseStatus.APPROVED,
    LeaseStatus.ACTIVE,
    LeaseStatus.EXPIRING,
)


class Tenant(BaseModel):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="tenant_profile",
    )
    emergency_contact_name = models.CharField(max_length=255, blank=True)
    emergency_contact_phone = models.CharField(max_length=32, blank=True)
    occupation = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(
        max_length=16,
        choices=TenantStatus.choices,
        default=TenantStatus.INACTIVE,
    )

    class Meta:
        ordering = ["user__last_name", "user__first_name", "user__email"]

    def __str__(self) -> str:
        return f"{self.user.get_full_name() or self.user.email}"


class Lease(BaseModel):
    tenant = models.ForeignKey(
        Tenant,
        on_delete=models.PROTECT,
        related_name="leases",
    )
    unit = models.ForeignKey(
        "properties.Unit",
        on_delete=models.PROTECT,
        related_name="leases",
    )
    application = models.ForeignKey(
        "applications.RentalApplication",
        on_delete=models.PROTECT,
        related_name="leases",
    )
    start_date = models.DateField()
    end_date = models.DateField()
    monthly_rent = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    deposit_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    payment_due_day = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(31)],
    )
    status = models.CharField(
        max_length=24,
        choices=LeaseStatus.choices,
        default=LeaseStatus.DRAFT,
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="leases_approved",
        null=True,
        blank=True,
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-start_date", "-created_at"]
        indexes = [
            models.Index(
                fields=["unit", "status", "start_date", "end_date"],
                name="lease_unit_period_status_idx",
            ),
            models.Index(
                fields=["status", "end_date"],
                name="lease_status_end_date_idx",
            ),
            models.Index(fields=["tenant", "status"], name="lease_tenant_status_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(monthly_rent__gt=0),
                name="lease_monthly_rent_positive",
            ),
            models.CheckConstraint(
                condition=models.Q(deposit_amount__gte=0),
                name="lease_deposit_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(payment_due_day__gte=1, payment_due_day__lte=31),
                name="lease_payment_due_day_range",
            ),
            models.CheckConstraint(
                condition=models.Q(start_date__lt=models.F("end_date")),
                name="lease_start_before_end",
            ),
        ]

    def clean(self) -> None:
        super().clean()
        errors = {}
        if (
            self.monthly_rent is not None
            and self.monthly_rent <= Decimal("0.00")
        ):
            errors["monthly_rent"] = "Monthly rent must be greater than zero."
        if (
            self.deposit_amount is not None
            and self.deposit_amount < Decimal("0.00")
        ):
            errors["deposit_amount"] = "Deposit amount cannot be negative."
        if self.payment_due_day is not None and not 1 <= self.payment_due_day <= 31:
            errors["payment_due_day"] = "Payment due day must be between 1 and 31."
        if self.start_date is not None and self.end_date is not None:
            if self.start_date >= self.end_date:
                errors["end_date"] = "End date must be after start date."
        if (
            self.application_id
            and self.application.status != ApplicationStatus.APPROVED
        ):
            errors["application"] = "A lease requires an approved application."
        if self.tenant_id and self.application_id:
            if (
                self.tenant.user.email.casefold()
                != self.application.applicant.email.casefold()
            ):
                errors["tenant"] = (
                    "Tenant email must match the approved applicant email."
                )
        if self.unit_id and self.application_id:
            if self.application.listing.unit_id != self.unit_id:
                errors["unit"] = "Lease unit must match the application listing unit."
        if (
            self.unit_id
            and self.start_date is not None
            and self.end_date is not None
            and self.start_date < self.end_date
        ):
            from .selectors.lease_selector import LeaseSelector

            if LeaseSelector.has_overlapping_active_lease(
                unit_id=self.unit_id,
                start_date=self.start_date,
                end_date=self.end_date,
                exclude_lease_id=self.pk,
            ):
                errors["start_date"] = (
                    "The unit already has an approved or active lease "
                    "during this period."
                )
        if errors:
            raise ValidationError(errors)

    def __str__(self) -> str:
        return f"{self.unit} ({self.start_date} to {self.end_date})"


class LeaseStatusHistory(UUIDModel):
    lease = models.ForeignKey(
        Lease,
        on_delete=models.CASCADE,
        related_name="status_history",
    )
    old_status = models.CharField(
        max_length=24,
        choices=LeaseStatus.choices,
        blank=True,
    )
    new_status = models.CharField(max_length=24, choices=LeaseStatus.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="lease_status_changes",
        null=True,
        blank=True,
    )
    change_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(
                fields=["lease", "created_at"],
                name="lease_history_created_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.lease_id}: {self.old_status or 'NEW'} -> {self.new_status}"


class RenewalAlert(BaseModel):
    lease = models.ForeignKey(
        Lease,
        on_delete=models.CASCADE,
        related_name="renewal_alerts",
    )
    alert_date = models.DateField()
    days_before_expiry = models.PositiveSmallIntegerField(
        choices=((90, "90 days"), (60, "60 days"), (30, "30 days")),
    )
    status = models.CharField(
        max_length=16,
        choices=RenewalAlertStatus.choices,
        default=RenewalAlertStatus.UNREAD,
    )

    class Meta:
        ordering = ["alert_date", "days_before_expiry"]
        indexes = [
            models.Index(
                fields=["status", "alert_date"],
                name="renewal_alert_status_date_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(days_before_expiry__in=(90, 60, 30)),
                name="renewal_alert_days_valid",
            ),
            models.UniqueConstraint(
                fields=["lease", "days_before_expiry"],
                name="renewal_alert_lease_days_unique",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.days_before_expiry}-day alert for lease {self.lease_id}"
