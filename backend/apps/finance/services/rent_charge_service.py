from calendar import monthrange
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.leases.models import Lease
from common.constants import LeaseStatus, RentChargeStatus
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse
from apps.properties.services.validation import validate_model

from ..models import RentCharge, RentSchedule
from ..selectors.finance_access_selector import FinanceAccessSelector
from ..selectors.rent_charge_selector import RentChargeSelector


class RentChargeService:
    ACTIVE_LEASE_STATUSES = (LeaseStatus.ACTIVE, LeaseStatus.EXPIRING)

    @classmethod
    def generate_monthly_charge(
        cls,
        schedule: RentSchedule,
        *,
        billing_month: int,
        billing_year: int,
        created_by: User,
        today: date | None = None,
    ) -> RentCharge:
        today = today or timezone.localdate()
        with transaction.atomic():
            locked_schedule = (
                RentSchedule.objects.select_for_update()
                .select_related(
                    "lease",
                    "lease__tenant",
                    "lease__unit__property",
                )
                .get(pk=schedule.pk)
            )
            due_date = cls._get_due_date(
                locked_schedule.due_day,
                billing_month=billing_month,
                billing_year=billing_year,
            )
            if not FinanceAccessSelector.user_can_manage_lease(
                user=created_by,
                lease=locked_schedule.lease,
            ):
                raise PermissionDeniedResponse(
                    "You cannot manage finance for this lease."
                )
            if not locked_schedule.is_active:
                raise ConflictErrorResponse("The rent schedule is inactive.")
            if locked_schedule.lease.status not in cls.ACTIVE_LEASE_STATUSES:
                raise ConflictErrorResponse(
                    "Rent charges can only be generated for active leases."
                )
            if not (
                locked_schedule.lease.start_date
                <= due_date
                <= locked_schedule.lease.end_date
            ):
                raise ConflictErrorResponse(
                    "The rent charge due date must fall within the lease period."
                )

            existing = RentCharge.objects.filter(
                lease=locked_schedule.lease,
                billing_month=billing_month,
                billing_year=billing_year,
            ).first()
            if existing is not None:
                return existing

            charge = RentCharge(
                lease=locked_schedule.lease,
                billing_month=billing_month,
                billing_year=billing_year,
                amount=locked_schedule.lease.monthly_rent,
                balance=locked_schedule.lease.monthly_rent,
                due_date=due_date,
                status=(
                    RentChargeStatus.OVERDUE
                    if due_date < today
                    else RentChargeStatus.PENDING
                ),
            )
            validate_model(charge)
            charge.save()
        return charge

    @classmethod
    def generate_monthly_charges(
        cls,
        *,
        billing_month: int,
        billing_year: int,
        created_by: User,
        today: date | None = None,
    ) -> list[RentCharge]:
        today = today or timezone.localdate()
        cls._get_due_date(
            1,
            billing_month=billing_month,
            billing_year=billing_year,
        )
        schedules = RentChargeSelector.get_active_schedules(
            user=created_by
        ).filter(lease__status__in=cls.ACTIVE_LEASE_STATUSES)
        generated = []
        for schedule in schedules.iterator():
            due_date = cls._get_due_date(
                schedule.due_day,
                billing_month=billing_month,
                billing_year=billing_year,
            )
            if not (
                schedule.lease.start_date
                <= due_date
                <= schedule.lease.end_date
            ):
                continue
            generated.append(
                cls.generate_monthly_charge(
                    schedule,
                    billing_month=billing_month,
                    billing_year=billing_year,
                    created_by=created_by,
                    today=today,
                )
            )
        return generated

    @staticmethod
    def mark_overdue(
        charge: RentCharge,
        *,
        changed_by: User,
        today: date | None = None,
    ) -> RentCharge:
        today = today or timezone.localdate()
        with transaction.atomic():
            locked_charge = (
                RentCharge.objects.select_for_update()
                .select_related("lease__unit__property")
                .get(pk=charge.pk)
            )
            if not FinanceAccessSelector.user_can_manage_lease(
                user=changed_by,
                lease=locked_charge.lease,
            ):
                raise PermissionDeniedResponse(
                    "You cannot manage finance for this lease."
                )
            if locked_charge.status in (
                RentChargeStatus.PAID,
                RentChargeStatus.CANCELLED,
            ):
                return locked_charge
            if locked_charge.balance <= Decimal("0.00"):
                raise ConflictErrorResponse(
                    "Only rent charges with an outstanding balance can become overdue."
                )
            if locked_charge.due_date >= today:
                raise ConflictErrorResponse(
                    "A rent charge cannot become overdue before its due date passes."
                )
            locked_charge.status = RentChargeStatus.OVERDUE
            locked_charge.save(update_fields=["status", "updated_at"])
        return locked_charge

    @staticmethod
    def _get_due_date(
        due_day: int,
        *,
        billing_month: int,
        billing_year: int,
    ) -> date:
        if not 1 <= billing_month <= 12 or not 1 <= billing_year <= 9999:
            raise ValidationError(
                {"billing_month": "Provide a valid billing month and year."}
            )
        day = min(due_day, monthrange(billing_year, billing_month)[1])
        return date(billing_year, billing_month, day)
