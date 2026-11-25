from datetime import date
from typing import Any

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.listings.models import Listing
from apps.properties.services.validation import validate_model
from common.constants import ApplicationStatus, ListingStatus, ScreeningStatus
from common.exceptions import ConflictErrorResponse

from ..models import (
    ACTIVE_APPLICATION_STATUSES,
    Applicant,
    RentalApplication,
    Screening,
)
from .screening_service import ScreeningService


class ApplicationService:
    @staticmethod
    def create_application(
        *,
        listing: Listing,
        applicant_data: dict[str, Any],
        move_in_date: date,
        notes: str = "",
    ) -> RentalApplication:
        try:
            with transaction.atomic():
                try:
                    locked_listing = (
                        Listing.objects.select_for_update()
                        .select_related("unit__property")
                        .get(pk=listing.pk)
                    )
                except Listing.DoesNotExist as exc:
                    raise ConflictErrorResponse(
                        "The selected listing is no longer available."
                    ) from exc

                if locked_listing.status != ListingStatus.PUBLISHED:
                    raise ConflictErrorResponse(
                        "Applications can only be submitted for published listings."
                    )
                if move_in_date < timezone.localdate():
                    raise ValidationError(
                        {"move_in_date": "Move-in date must be today or in the future."}
                    )

                email = applicant_data["email"].strip().lower()
                duplicate_exists = RentalApplication.objects.filter(
                    listing=locked_listing,
                    applicant__email__iexact=email,
                    status__in=ACTIVE_APPLICATION_STATUSES,
                ).exists()
                if duplicate_exists:
                    raise ConflictErrorResponse(
                        "An active application already exists for this listing and applicant."
                    )

                applicant = Applicant(
                    email=email,
                    **{
                        key: value
                        for key, value in applicant_data.items()
                        if key != "email"
                    },
                )
                validate_model(applicant)
                applicant.save()

                application = RentalApplication(
                    listing=locked_listing,
                    applicant=applicant,
                    move_in_date=move_in_date,
                    notes=notes,
                    status=ApplicationStatus.SUBMITTED,
                )
                validate_model(application)
                application.save()
        except IntegrityError as exc:
            raise ConflictErrorResponse(
                "An active application already exists for this listing and applicant."
            ) from exc
        return application

    @staticmethod
    def submit_for_review(application: RentalApplication) -> RentalApplication:
        with transaction.atomic():
            locked_application = ApplicationService._lock_application(application)
            if locked_application.status != ApplicationStatus.SUBMITTED:
                raise ConflictErrorResponse(
                    "Only submitted applications can be moved to review."
                )
            locked_application.status = ApplicationStatus.UNDER_REVIEW
            locked_application.save(update_fields=["status", "updated_at"])
        return locked_application

    @staticmethod
    def start_screening(application: RentalApplication) -> RentalApplication:
        with transaction.atomic():
            locked_application = ApplicationService._lock_application(application)
            if locked_application.status != ApplicationStatus.UNDER_REVIEW:
                raise ConflictErrorResponse(
                    "Only applications under review can start screening."
                )
            locked_application.status = ApplicationStatus.SCREENING
            locked_application.save(update_fields=["status", "updated_at"])
            ScreeningService.create_screening(application=locked_application)
        return locked_application

    @staticmethod
    def approve_application(application: RentalApplication) -> RentalApplication:
        with transaction.atomic():
            locked_application = ApplicationService._lock_application(application)
            if locked_application.status != ApplicationStatus.SCREENING:
                raise ConflictErrorResponse(
                    "Only applications in screening can be approved."
                )
            try:
                screening = locked_application.screening
            except Screening.DoesNotExist as exc:
                raise ConflictErrorResponse(
                    "A passed screening is required to approve an application."
                ) from exc
            if screening.status != ScreeningStatus.PASSED:
                raise ConflictErrorResponse(
                    "A passed screening is required to approve an application."
                )
            locked_application.status = ApplicationStatus.APPROVED
            locked_application.save(update_fields=["status", "updated_at"])
        return locked_application

    @staticmethod
    def reject_application(
        application: RentalApplication,
        *,
        rejection_reason: str,
    ) -> RentalApplication:
        normalized_reason = rejection_reason.strip()
        if not normalized_reason:
            raise ValidationError(
                {"rejection_reason": "A rejection reason is required."}
            )
        with transaction.atomic():
            locked_application = ApplicationService._lock_application(application)
            if locked_application.status != ApplicationStatus.SCREENING:
                raise ConflictErrorResponse(
                    "Only applications in screening can be rejected."
                )
            locked_application.status = ApplicationStatus.REJECTED
            locked_application.rejection_reason = normalized_reason
            locked_application.save(
                update_fields=["status", "rejection_reason", "updated_at"]
            )
        return locked_application

    @staticmethod
    def withdraw_application(application: RentalApplication) -> RentalApplication:
        with transaction.atomic():
            locked_application = ApplicationService._lock_application(application)
            if locked_application.status not in (
                ApplicationStatus.SUBMITTED,
                ApplicationStatus.UNDER_REVIEW,
            ):
                raise ConflictErrorResponse(
                    "Only submitted or under-review applications can be withdrawn."
                )
            locked_application.status = ApplicationStatus.WITHDRAWN
            locked_application.save(update_fields=["status", "updated_at"])
        return locked_application

    @staticmethod
    def _lock_application(application: RentalApplication) -> RentalApplication:
        return (
            RentalApplication.objects.select_for_update()
            .select_related("listing", "applicant")
            .get(pk=application.pk)
        )
