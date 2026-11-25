from django.db import IntegrityError, transaction

from apps.accounts.models import User
from apps.leases.models import Lease
from common.constants import LeaseStatus, RentFrequency
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse
from apps.properties.services.validation import validate_model

from ..models import RentSchedule
from ..selectors.finance_access_selector import FinanceAccessSelector


class RentScheduleService:
    ACTIVE_LEASE_STATUSES = (LeaseStatus.ACTIVE, LeaseStatus.EXPIRING)

    @classmethod
    def create_schedule(
        cls,
        *,
        lease: Lease,
        created_by: User,
        due_day: int | None = None,
        frequency: str = RentFrequency.MONTHLY,
        is_active: bool = True,
    ) -> RentSchedule:
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
                if locked_lease.status not in cls.ACTIVE_LEASE_STATUSES:
                    raise ConflictErrorResponse(
                        "A rent schedule requires an active lease."
                    )
                if RentSchedule.objects.filter(lease=locked_lease).exists():
                    raise ConflictErrorResponse(
                        "A rent schedule already exists for this lease."
                    )
                schedule = RentSchedule(
                    lease=locked_lease,
                    due_day=(
                        locked_lease.payment_due_day
                        if due_day is None
                        else due_day
                    ),
                    frequency=frequency,
                    is_active=is_active,
                )
                validate_model(schedule)
                schedule.save()
        except IntegrityError as exc:
            raise ConflictErrorResponse(
                "A rent schedule already exists for this lease."
            ) from exc
        return schedule

    @staticmethod
    def update_schedule(
        schedule: RentSchedule,
        *,
        updated_by: User,
        due_day: int,
        frequency: str,
        is_active: bool,
    ) -> RentSchedule:
        with transaction.atomic():
            locked_schedule = (
                RentSchedule.objects.select_for_update()
                .select_related("lease__unit__property")
                .get(pk=schedule.pk)
            )
            if not FinanceAccessSelector.user_can_manage_lease(
                user=updated_by,
                lease=locked_schedule.lease,
            ):
                raise PermissionDeniedResponse(
                    "You cannot manage finance for this lease."
                )
            locked_schedule.due_day = due_day
            locked_schedule.frequency = frequency
            locked_schedule.is_active = is_active
            validate_model(locked_schedule)
            locked_schedule.save(
                update_fields=["due_day", "frequency", "is_active", "updated_at"]
            )
        return locked_schedule
