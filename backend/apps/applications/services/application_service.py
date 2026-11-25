from datetime import date
from typing import Any

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.audit.services.audit_log_service import AuditContext, AuditLogService
from apps.listings.models import Listing
from apps.notifications.services.notification_service import NotificationService
from apps.properties.services.validation import validate_model
from common.constants import (
    ApplicationStatus,
    AuditAction,
    ListingStatus,
    NotificationType,
    ScreeningStatus,
    UserRole,
)
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
    def approve_application(
        application: RentalApplication,
        *,
        approved_by: User | None = None,
        audit_context: AuditContext | None = None,
    ) -> RentalApplication:
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
            old_status = locked_application.status
            locked_application.status = ApplicationStatus.APPROVED
            locked_application.save(update_fields=["status", "updated_at"])
            AuditLogService.log_action(
                user=approved_by,
                action=AuditAction.APPLICATION_APPROVED,
                model_name="RentalApplication",
                object_id=str(locked_application.pk),
                old_data={"status": old_status},
                new_data={"status": locked_application.status},
                context=audit_context,
            )
            applicant_user = ApplicationService._get_applicant_user(
                locked_application
            )
            if applicant_user is not None:
                NotificationService.create_notification(
                    user=applicant_user,
                    title="Application approved",
                    message=(
                        f"Your application for "
                        f"{locked_application.listing.title} was approved."
                    ),
                    type=NotificationType.SYSTEM,
                )
        return locked_application

    @staticmethod
    def reject_application(
        application: RentalApplication,
        *,
        rejection_reason: str,
        rejected_by: User | None = None,
        audit_context: AuditContext | None = None,
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
            old_status = locked_application.status
            locked_application.status = ApplicationStatus.REJECTED
            locked_application.rejection_reason = normalized_reason
            locked_application.save(
                update_fields=["status", "rejection_reason", "updated_at"]
            )
            AuditLogService.log_action(
                user=rejected_by,
                action=AuditAction.APPLICATION_REJECTED,
                model_name="RentalApplication",
                object_id=str(locked_application.pk),
                old_data={"status": old_status},
                new_data={
                    "status": locked_application.status,
                    "rejection_reason": normalized_reason,
                },
                context=audit_context,
            )
            applicant_user = ApplicationService._get_applicant_user(
                locked_application
            )
            if applicant_user is not None:
                NotificationService.create_notification(
                    user=applicant_user,
                    title="Application update",
                    message=(
                        f"Your application for "
                        f"{locked_application.listing.title} was not approved."
                    ),
                    type=NotificationType.SYSTEM,
                )
        return locked_application

    @staticmethod
    def _get_applicant_user(application: RentalApplication) -> User | None:
        return User.objects.filter(
            email__iexact=application.applicant.email,
            role=UserRole.TENANT,
            is_active=True,
        ).order_by("pk").first()

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
