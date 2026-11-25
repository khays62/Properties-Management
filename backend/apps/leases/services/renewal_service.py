from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone
from common.constants import LeaseStatus, RenewalAlertStatus
from common.exceptions import ConflictErrorResponse

from ..models import Lease, LeaseStatusHistory, RenewalAlert
from ..selectors.lease_selector import OCCUPANCY_LEASE_STATUSES


class RenewalService:
    ALERT_OFFSETS = (90, 60, 30)

    @classmethod
    def generate_renewal_alerts(
        cls,
        *,
        today: date | None = None,
    ) -> list[RenewalAlert]:
        today = today or timezone.localdate()
        generated = []
        with transaction.atomic():
            leases = (
                Lease.objects.select_for_update()
                .filter(
                    status__in=OCCUPANCY_LEASE_STATUSES,
                    end_date__gte=today,
                    end_date__lte=today + timedelta(days=90),
                )
                .order_by("end_date", "pk")
            )
            for lease in leases:
                if lease.status == LeaseStatus.ACTIVE:
                    lease.status = LeaseStatus.EXPIRING
                    lease.save(update_fields=["status", "updated_at"])
                    LeaseStatusHistory.objects.create(
                        lease=lease,
                        old_status=LeaseStatus.ACTIVE,
                        new_status=LeaseStatus.EXPIRING,
                        change_reason="Lease entered its 90-day renewal window.",
                    )

                for days_before_expiry in cls.ALERT_OFFSETS:
                    alert_date = lease.end_date - timedelta(
                        days=days_before_expiry
                    )
                    if alert_date > today:
                        continue
                    alert, created = RenewalAlert.objects.get_or_create(
                        lease=lease,
                        days_before_expiry=days_before_expiry,
                        defaults={
                            "alert_date": alert_date,
                            "status": RenewalAlertStatus.UNREAD,
                        },
                    )
                    if created:
                        generated.append(alert)
        return generated

    @staticmethod
    def mark_alert_read(alert: RenewalAlert) -> RenewalAlert:
        with transaction.atomic():
            locked_alert = RenewalAlert.objects.select_for_update().get(pk=alert.pk)
            if locked_alert.status == RenewalAlertStatus.RESOLVED:
                raise ConflictErrorResponse("Resolved alerts cannot be marked read.")
            if locked_alert.status == RenewalAlertStatus.UNREAD:
                locked_alert.status = RenewalAlertStatus.READ
                locked_alert.save(update_fields=["status", "updated_at"])
        return locked_alert

    @staticmethod
    def resolve_alert(alert: RenewalAlert) -> RenewalAlert:
        with transaction.atomic():
            locked_alert = RenewalAlert.objects.select_for_update().get(pk=alert.pk)
            if locked_alert.status != RenewalAlertStatus.RESOLVED:
                locked_alert.status = RenewalAlertStatus.RESOLVED
                locked_alert.save(update_fields=["status", "updated_at"])
        return locked_alert
