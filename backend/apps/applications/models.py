from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone

from apps.listings.models import Listing
from common.constants import (
    ApplicationStatus,
    EmploymentStatus,
    ScreeningStatus,
)
from common.models import BaseModel


ACTIVE_APPLICATION_STATUSES = (
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.SCREENING,
)


class Applicant(BaseModel):
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=32)
    employment_status = models.CharField(
        max_length=20,
        choices=EmploymentStatus.choices,
    )
    employer_name = models.CharField(max_length=255, blank=True)
    monthly_income = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.00"))],
    )
    current_address = models.TextField()

    class Meta:
        ordering = ["last_name", "first_name"]
        indexes = [
            models.Index(fields=["email"], name="applicant_email_idx"),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(monthly_income__gte=0),
                name="applicant_income_nonnegative",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} ({self.email})"


class RentalApplication(BaseModel):
    listing = models.ForeignKey(
        Listing,
        on_delete=models.PROTECT,
        related_name="applications",
    )
    applicant = models.ForeignKey(
        Applicant,
        on_delete=models.PROTECT,
        related_name="applications",
    )
    move_in_date = models.DateField()
    notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.SUBMITTED,
    )
    submitted_at = models.DateTimeField(default=timezone.now, editable=False)

    class Meta:
        ordering = ["-submitted_at"]
        indexes = [
            models.Index(
                fields=["status", "submitted_at"],
                name="application_status_date_idx",
            ),
            models.Index(
                fields=["listing", "status"],
                name="application_listing_status_idx",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["listing", "applicant"],
                condition=models.Q(status__in=ACTIVE_APPLICATION_STATUSES),
                name="application_one_active_per_applicant_listing",
            ),
            models.CheckConstraint(
                condition=(
                    ~models.Q(status=ApplicationStatus.REJECTED)
                    | ~models.Q(rejection_reason="")
                ),
                name="application_rejection_reason_required",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.applicant} - {self.listing}"


class Screening(BaseModel):
    application = models.OneToOneField(
        RentalApplication,
        on_delete=models.CASCADE,
        related_name="screening",
    )
    score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    notes = models.TextField(blank=True)
    income_verified = models.BooleanField(default=False)
    employment_verified = models.BooleanField(default=False)
    references_checked = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=ScreeningStatus.choices,
        default=ScreeningStatus.PENDING,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="screenings_reviewed",
        null=True,
        blank=True,
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["status", "reviewed_at"],
                name="screening_status_reviewed_idx",
            ),
        ]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(score__isnull=True)
                    | models.Q(score__gte=0, score__lte=100)
                ),
                name="screening_score_0_to_100",
            ),
        ]

    def __str__(self) -> str:
        return f"Screening for application {self.application_id}"
