from datetime import date, timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.accounts.models import User
from apps.accounts.services.tenant_invitation_service import TenantInvitationService
from apps.applications.models import RentalApplication, Screening
from apps.audit.services.audit_log_service import AuditContext, AuditLogService
from apps.listings.models import Listing
from apps.notifications.services.notification_service import NotificationService
from apps.properties.models import Unit
from apps.properties.services.validation import validate_model
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import (
    ApplicationStatus,
    AuditAction,
    LeaseStatus,
    ListingStatus,
    NotificationType,
    TenantStatus,
    UnitStatus,
)
from common.exceptions import ConflictErrorResponse, PermissionDeniedResponse

from ..models import Lease, LeaseStatusHistory
from ..selectors.lease_selector import LeaseSelector, OCCUPANCY_LEASE_STATUSES
from .tenant_service import TenantService


class LeaseService:
    @staticmethod
    def create_lease(
        *,
        created_by: User,
        application: RentalApplication,
        start_date: date,
        end_date: date,
        monthly_rent: Decimal,
        deposit_amount: Decimal,
        payment_due_day: int,
        notes: str = "",
    ) -> Lease:
        with transaction.atomic():
            locked_application = (
                RentalApplication.objects.select_for_update()
                .select_related(
                    "applicant",
                    "listing",
                    "listing__unit",
                    "listing__unit__property",
                )
                .get(pk=application.pk)
            )
            property_obj = locked_application.listing.unit.property
            if not PropertySelector.user_can_manage_property(
                created_by,
                property_obj,
            ):
                raise PermissionDeniedResponse(
                    "You cannot create leases for this property."
                )
            if locked_application.status != ApplicationStatus.APPROVED:
                raise ConflictErrorResponse(
                    "Leases can only be created from approved applications."
                )
            if locked_application.listing.status != ListingStatus.PUBLISHED:
                raise ConflictErrorResponse(
                    "The application listing must still be published."
                )
            if locked_application.listing.unit.status != UnitStatus.LISTED:
                raise ConflictErrorResponse(
                    "The application unit must still be listed."
                )
            LeaseService._require_passed_screening(locked_application)

            listing = Listing.objects.select_for_update().get(
                pk=locked_application.listing_id
            )
            unit = Unit.objects.select_for_update().get(pk=listing.unit_id)
            if listing.status != ListingStatus.PUBLISHED:
                raise ConflictErrorResponse(
                    "The application listing is no longer published."
                )
            if unit.status != UnitStatus.LISTED:
                raise ConflictErrorResponse(
                    "The application unit is no longer listed."
                )
            LeaseService._validate_period(
                unit_id=unit.pk,
                start_date=start_date,
                end_date=end_date,
            )
            tenant = TenantService.create_tenant(
                applicant=locked_application.applicant,
                allow_existing=True,
                send_invitation=False,
            )
            lease = Lease(
                tenant=tenant,
                unit=unit,
                application=locked_application,
                start_date=start_date,
                end_date=end_date,
                monthly_rent=monthly_rent,
                deposit_amount=deposit_amount,
                payment_due_day=payment_due_day,
                status=LeaseStatus.DRAFT,
                notes=notes,
            )
            validate_model(lease)
            lease.save()
            LeaseService._record_status(
                lease=lease,
                old_status="",
                new_status=LeaseStatus.DRAFT,
                changed_by=created_by,
                change_reason="Lease created from an approved application.",
            )
            TenantInvitationService.send_password_setup_email(tenant.user)
        return lease

    @staticmethod
    def submit_for_approval(
        lease: Lease,
        *,
        changed_by: User,
    ) -> Lease:
        with transaction.atomic():
            locked_lease = LeaseService._lock_lease(lease)
            if locked_lease.status != LeaseStatus.DRAFT:
                raise ConflictErrorResponse("Only draft leases can be submitted.")
            unit = Unit.objects.select_for_update().get(pk=locked_lease.unit_id)
            LeaseService._validate_period(
                unit_id=unit.pk,
                start_date=locked_lease.start_date,
                end_date=locked_lease.end_date,
                exclude_lease_id=locked_lease.pk,
            )
            LeaseService._transition(
                locked_lease,
                LeaseStatus.PENDING_APPROVAL,
                changed_by=changed_by,
                change_reason="Submitted for approval.",
            )
        return locked_lease

    @staticmethod
    def approve_lease(
        lease: Lease,
        *,
        approved_by: User,
        audit_context: AuditContext | None = None,
    ) -> Lease:
        with transaction.atomic():
            locked_lease = LeaseService._lock_lease(lease)
            if locked_lease.status != LeaseStatus.PENDING_APPROVAL:
                raise ConflictErrorResponse(
                    "Only leases pending approval can be approved."
                )
            unit = Unit.objects.select_for_update().get(pk=locked_lease.unit_id)
            LeaseService._validate_period(
                unit_id=unit.pk,
                start_date=locked_lease.start_date,
                end_date=locked_lease.end_date,
                exclude_lease_id=locked_lease.pk,
            )
            old_status = locked_lease.status
            locked_lease.approved_by = approved_by
            locked_lease.approved_at = timezone.now()
            locked_lease.save(
                update_fields=["approved_by", "approved_at", "updated_at"]
            )
            LeaseService._transition(
                locked_lease,
                LeaseStatus.APPROVED,
                changed_by=approved_by,
                change_reason="Lease approved.",
            )
            AuditLogService.log_action(
                user=approved_by,
                action=AuditAction.LEASE_APPROVED,
                model_name="Lease",
                object_id=str(locked_lease.pk),
                old_data={"status": old_status},
                new_data={"status": locked_lease.status},
                context=audit_context,
            )
            NotificationService.create_notification(
                user=locked_lease.tenant.user,
                title="Lease approved",
                message=f"Your lease for {locked_lease.unit} has been approved.",
                type=NotificationType.LEASE,
            )
        return locked_lease

    @staticmethod
    def activate_lease(
        lease: Lease,
        *,
        changed_by: User,
        audit_context: AuditContext | None = None,
    ) -> Lease:
        with transaction.atomic():
            locked_lease = LeaseService._lock_lease(lease)
            if locked_lease.status != LeaseStatus.APPROVED:
                raise ConflictErrorResponse(
                    "Only approved leases can be activated."
                )
            listing = Listing.objects.select_for_update().get(
                pk=locked_lease.application.listing_id
            )
            unit = Unit.objects.select_for_update().get(pk=locked_lease.unit_id)
            LeaseService._validate_period(
                unit_id=unit.pk,
                start_date=locked_lease.start_date,
                end_date=locked_lease.end_date,
                exclude_lease_id=locked_lease.pk,
            )

            is_initial_occupancy = (
                unit.status == UnitStatus.LISTED
                and listing.status == ListingStatus.PUBLISHED
            )
            is_renewal_occupancy = (
                unit.status == UnitStatus.OCCUPIED
                and listing.status == ListingStatus.CLOSED
                and Lease.objects.filter(
                    tenant=locked_lease.tenant,
                    unit=unit,
                    status=LeaseStatus.RENEWED,
                    end_date=locked_lease.start_date - timedelta(days=1),
                ).exists()
            )
            if not (is_initial_occupancy or is_renewal_occupancy):
                raise ConflictErrorResponse(
                    "The unit and listing are not in an activatable state."
                )

            if is_initial_occupancy:
                listing.status = ListingStatus.CLOSED
                listing.save(update_fields=["status", "updated_at"])
                AuditLogService.log_action(
                    user=changed_by,
                    action=AuditAction.LISTING_CLOSED,
                    model_name="Listing",
                    object_id=str(listing.pk),
                    old_data={"status": ListingStatus.PUBLISHED},
                    new_data={"status": listing.status},
                    context=audit_context,
                )
                unit.status = UnitStatus.OCCUPIED
                unit.save(update_fields=["status", "updated_at"])
            locked_lease.tenant.status = TenantStatus.ACTIVE
            locked_lease.tenant.save(update_fields=["status", "updated_at"])
            LeaseService._transition(
                locked_lease,
                LeaseStatus.ACTIVE,
                changed_by=changed_by,
                change_reason="Lease activated.",
            )
            AuditLogService.log_action(
                user=changed_by,
                action=AuditAction.LEASE_ACTIVATED,
                model_name="Lease",
                object_id=str(locked_lease.pk),
                old_data={"status": LeaseStatus.APPROVED},
                new_data={"status": locked_lease.status},
                context=audit_context,
            )
            NotificationService.create_notification(
                user=locked_lease.tenant.user,
                title="Lease activated",
                message=f"Your lease for {locked_lease.unit} is now active.",
                type=NotificationType.LEASE,
            )
        return locked_lease

    @staticmethod
    def renew_lease(
        lease: Lease,
        *,
        new_end_date: date,
        changed_by: User,
        audit_context: AuditContext | None = None,
    ) -> Lease:
        with transaction.atomic():
            locked_lease = LeaseService._lock_lease(lease)
            if locked_lease.status not in OCCUPANCY_LEASE_STATUSES:
                raise ConflictErrorResponse(
                    "Only active or expiring leases can be renewed."
                )
            if new_end_date <= locked_lease.end_date + timedelta(days=1):
                raise ValidationError(
                    {
                        "new_end_date": (
                            "New end date must be after the successor start date."
                        )
                    }
                )
            unit = Unit.objects.select_for_update().get(pk=locked_lease.unit_id)
            if unit.status != UnitStatus.OCCUPIED:
                raise ConflictErrorResponse(
                    "The unit must be occupied to renew its lease."
                )

            old_status = locked_lease.status
            successor_start = locked_lease.end_date + timedelta(days=1)
            LeaseService._transition(
                locked_lease,
                LeaseStatus.RENEWED,
                changed_by=changed_by,
                change_reason="Renewed; successor lease created.",
            )
            successor = Lease(
                tenant=locked_lease.tenant,
                unit=unit,
                application=locked_lease.application,
                start_date=successor_start,
                end_date=new_end_date,
                monthly_rent=locked_lease.monthly_rent,
                deposit_amount=locked_lease.deposit_amount,
                payment_due_day=locked_lease.payment_due_day,
                status=LeaseStatus.PENDING_APPROVAL,
                notes=locked_lease.notes,
            )
            LeaseService._validate_period(
                unit_id=unit.pk,
                start_date=successor.start_date,
                end_date=successor.end_date,
            )
            validate_model(successor)
            successor.save()
            LeaseService._record_status(
                lease=successor,
                old_status="",
                new_status=LeaseStatus.PENDING_APPROVAL,
                changed_by=changed_by,
                change_reason=f"Renewal successor to lease {locked_lease.pk}.",
            )
            AuditLogService.log_action(
                user=changed_by,
                action=AuditAction.LEASE_RENEWED,
                model_name="Lease",
                object_id=str(locked_lease.pk),
                old_data={"status": old_status},
                new_data={
                    "status": locked_lease.status,
                    "successor_lease_id": str(successor.pk),
                },
                context=audit_context,
            )
        return successor

    @staticmethod
    def terminate_lease(
        lease: Lease,
        *,
        changed_by: User,
        change_reason: str = "",
    ) -> Lease:
        return LeaseService._end_lease(
            lease,
            new_status=LeaseStatus.TERMINATED,
            changed_by=changed_by,
            change_reason=change_reason or "Lease terminated.",
        )

    @staticmethod
    def expire_lease(
        lease: Lease,
        *,
        changed_by: User | None = None,
    ) -> Lease:
        return LeaseService._end_lease(
            lease,
            new_status=LeaseStatus.EXPIRED,
            changed_by=changed_by,
            change_reason="Lease expired.",
        )

    @staticmethod
    def _end_lease(
        lease: Lease,
        *,
        new_status: LeaseStatus,
        changed_by: User | None,
        change_reason: str,
    ) -> Lease:
        with transaction.atomic():
            locked_lease = LeaseService._lock_lease(lease)
            if locked_lease.status not in OCCUPANCY_LEASE_STATUSES:
                raise ConflictErrorResponse(
                    "Only active or expiring leases can be ended."
                )
            if (
                new_status == LeaseStatus.EXPIRED
                and locked_lease.end_date >= timezone.localdate()
            ):
                raise ConflictErrorResponse(
                    "A lease cannot expire before its end date has passed."
                )
            unit = Unit.objects.select_for_update().get(pk=locked_lease.unit_id)
            if unit.status != UnitStatus.OCCUPIED:
                raise ConflictErrorResponse(
                    "The unit must be occupied to end this lease."
                )
            LeaseService._transition(
                locked_lease,
                new_status,
                changed_by=changed_by,
                change_reason=change_reason,
            )
            unit.status = UnitStatus.AVAILABLE
            unit.save(update_fields=["status", "updated_at"])
            other_active_lease = Lease.objects.filter(
                tenant=locked_lease.tenant,
                status__in=OCCUPANCY_LEASE_STATUSES,
            ).exclude(pk=locked_lease.pk).exists()
            if not other_active_lease:
                locked_lease.tenant.status = TenantStatus.MOVED_OUT
                locked_lease.tenant.save(update_fields=["status", "updated_at"])
        return locked_lease

    @staticmethod
    def _lock_lease(lease: Lease) -> Lease:
        return (
            Lease.objects.select_for_update()
            .select_related("tenant", "tenant__user", "unit", "application")
            .get(pk=lease.pk)
        )

    @staticmethod
    def _validate_period(
        *,
        unit_id,
        start_date: date,
        end_date: date,
        exclude_lease_id=None,
    ) -> None:
        if start_date >= end_date:
            raise ValidationError({"end_date": "End date must be after start date."})
        if LeaseSelector.has_overlapping_active_lease(
            unit_id=unit_id,
            start_date=start_date,
            end_date=end_date,
            exclude_lease_id=exclude_lease_id,
        ):
            raise ConflictErrorResponse(
                "The unit already has an approved or active lease during this period."
            )

    @staticmethod
    def _require_passed_screening(application: RentalApplication) -> None:
        try:
            screening = application.screening
        except Screening.DoesNotExist as exc:
            raise ConflictErrorResponse(
                "A passed screening is required before creating a lease."
            ) from exc
        from common.constants import ScreeningStatus

        if screening.status != ScreeningStatus.PASSED:
            raise ConflictErrorResponse(
                "A passed screening is required before creating a lease."
            )

    @staticmethod
    def _transition(
        lease: Lease,
        new_status: LeaseStatus,
        *,
        changed_by: User | None,
        change_reason: str,
    ) -> None:
        old_status = lease.status
        lease.status = new_status
        lease.save(update_fields=["status", "updated_at"])
        LeaseService._record_status(
            lease=lease,
            old_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            change_reason=change_reason,
        )

    @staticmethod
    def _record_status(
        *,
        lease: Lease,
        old_status: str,
        new_status: LeaseStatus,
        changed_by: User | None,
        change_reason: str,
    ) -> LeaseStatusHistory:
        return LeaseStatusHistory.objects.create(
            lease=lease,
            old_status=old_status,
            new_status=new_status,
            changed_by=changed_by,
            change_reason=change_reason,
        )
