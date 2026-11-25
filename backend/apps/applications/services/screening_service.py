from typing import Any

from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.properties.services.validation import validate_model
from common.constants import ApplicationStatus, ScreeningStatus
from common.exceptions import ConflictErrorResponse

from ..models import RentalApplication, Screening


class ScreeningService:
    @staticmethod
    def create_screening(*, application: RentalApplication) -> Screening:
        try:
            with transaction.atomic():
                locked_application = (
                    RentalApplication.objects.select_for_update()
                    .get(pk=application.pk)
                )
                if locked_application.status != ApplicationStatus.SCREENING:
                    raise ConflictErrorResponse(
                        "Screenings can only be created for applications in screening."
                    )
                screening = Screening(
                    application=locked_application,
                    status=ScreeningStatus.PENDING,
                )
                validate_model(screening)
                screening.save()
        except IntegrityError as exc:
            raise ConflictErrorResponse(
                "A screening already exists for this application."
            ) from exc
        return screening

    @staticmethod
    def start_screening(
        screening: Screening,
        *,
        reviewed_by: User,
    ) -> Screening:
        with transaction.atomic():
            locked_screening, application = ScreeningService._lock_screening(screening)
            if application.status != ApplicationStatus.SCREENING:
                raise ConflictErrorResponse(
                    "The application is not in screening."
                )
            if locked_screening.status != ScreeningStatus.PENDING:
                raise ConflictErrorResponse(
                    "Only pending screenings can be started."
                )
            locked_screening.status = ScreeningStatus.IN_PROGRESS
            locked_screening.reviewed_by = reviewed_by
            locked_screening.save(
                update_fields=["status", "reviewed_by", "updated_at"]
            )
        return locked_screening

    @staticmethod
    def pass_screening(
        screening: Screening,
        *,
        reviewed_by: User,
        result_data: dict[str, Any],
    ) -> Screening:
        return ScreeningService._complete_screening(
            screening,
            reviewed_by=reviewed_by,
            result_data=result_data,
            status=ScreeningStatus.PASSED,
        )

    @staticmethod
    def fail_screening(
        screening: Screening,
        *,
        reviewed_by: User,
        result_data: dict[str, Any],
    ) -> Screening:
        return ScreeningService._complete_screening(
            screening,
            reviewed_by=reviewed_by,
            result_data=result_data,
            status=ScreeningStatus.FAILED,
        )

    @staticmethod
    def _complete_screening(
        screening: Screening,
        *,
        reviewed_by: User,
        result_data: dict[str, Any],
        status: ScreeningStatus,
    ) -> Screening:
        with transaction.atomic():
            locked_screening, application = ScreeningService._lock_screening(screening)
            if application.status != ApplicationStatus.SCREENING:
                raise ConflictErrorResponse(
                    "The application is not in screening."
                )
            if locked_screening.status != ScreeningStatus.IN_PROGRESS:
                raise ConflictErrorResponse(
                    "Only in-progress screenings can be completed."
                )

            for field, value in result_data.items():
                setattr(locked_screening, field, value)
            locked_screening.status = status
            locked_screening.reviewed_by = reviewed_by
            locked_screening.reviewed_at = timezone.now()
            validate_model(locked_screening)
            locked_screening.save(
                update_fields=[
                    *result_data.keys(),
                    "status",
                    "reviewed_by",
                    "reviewed_at",
                    "updated_at",
                ]
            )
        return locked_screening

    @staticmethod
    def _lock_screening(screening: Screening) -> tuple[Screening, RentalApplication]:
        application = RentalApplication.objects.select_for_update().get(
            pk=screening.application_id
        )
        locked_screening = Screening.objects.select_for_update().get(
            pk=screening.pk
        )
        return locked_screening, application
