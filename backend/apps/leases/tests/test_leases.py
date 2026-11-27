from datetime import timedelta
from decimal import Decimal
from urllib.parse import parse_qs, urlsplit

from django.core import mail
from django.core.exceptions import ValidationError as DjangoValidationError
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import PropertyAssignment, TeamMembership, User
from apps.applications.models import Applicant, RentalApplication, Screening
from apps.audit.models import AuditLog
from apps.listings.services.listing_service import ListingService
from apps.notifications.models import Notification
from apps.properties.models import Property, Unit
from common.constants import (
    ApplicationStatus,
    AuditAction,
    EmploymentStatus,
    LeaseStatus,
    ListingStatus,
    NotificationType,
    PropertyStatus,
    RenewalAlertStatus,
    ScreeningStatus,
    TenantStatus,
    UnitStatus,
    UserRole,
)
from common.exceptions import ConflictErrorResponse

from ..models import Lease, LeaseStatusHistory, RenewalAlert
from ..serializers import LeaseSerializer
from ..services.lease_service import LeaseService
from ..services.renewal_service import RenewalService


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class LeaseWorkflowTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="leases-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        self.property = Property.objects.create(
            owner=self.owner,
            name="Lease Test Property",
            code="LEASE-TEST-01",
            address="100 Test Street",
            city="Mogadishu",
            country="Somalia",
            status=PropertyStatus.ACTIVE,
        )
        self.unit = Unit.objects.create(
            property=self.property,
            unit_number="A-101",
            floor=1,
            bedrooms=2,
            bathrooms=Decimal("1.50"),
            square_meters=Decimal("80.00"),
            rent_amount=Decimal("800.00"),
            deposit_amount=Decimal("800.00"),
            status=UnitStatus.AVAILABLE,
        )
        draft = ListingService.create_listing(
            created_by=self.owner,
            unit=self.unit,
            title="Lease Test Listing",
            description="A test listing.",
            rent_amount=Decimal("800.00"),
            deposit_amount=Decimal("800.00"),
            available_date=timezone.localdate(),
        )
        self.listing = ListingService.publish_listing(draft)
        self.client.force_authenticate(self.owner)

    def create_application(self, email="tenant@example.com"):
        applicant = Applicant.objects.create(
            first_name="Amina",
            last_name="Tenant",
            email=email,
            phone="+252610000000",
            employment_status=EmploymentStatus.EMPLOYED,
            employer_name="Example Employer",
            monthly_income=Decimal("1500.00"),
            current_address="Mogadishu",
        )
        application = RentalApplication.objects.create(
            listing=self.listing,
            applicant=applicant,
            move_in_date=timezone.localdate(),
            status=ApplicationStatus.APPROVED,
        )
        Screening.objects.create(
            application=application,
            score=90,
            status=ScreeningStatus.PASSED,
        )
        return application

    def create_lease(
        self,
        *,
        email="tenant@example.com",
        start_date=None,
        end_date=None,
    ):
        today = timezone.localdate()
        application = self.create_application(email=email)
        return LeaseService.create_lease(
            created_by=self.owner,
            application=application,
            start_date=start_date or today,
            end_date=end_date or today + timedelta(days=365),
            monthly_rent=Decimal("800.00"),
            deposit_amount=Decimal("800.00"),
            payment_due_day=1,
        )

    def activate_lease(self, lease):
        LeaseService.submit_for_approval(lease, changed_by=self.owner)
        LeaseService.approve_lease(lease, approved_by=self.owner)
        return LeaseService.activate_lease(lease, changed_by=self.owner)

    def test_creation_provisions_tenant_and_password_setup_link(self):
        application = self.create_application()
        start_date = timezone.localdate()
        end_date = start_date + timedelta(days=365)
        response = self.client.post(
            reverse("leases:lease-list"),
            {
                "application": str(application.pk),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "monthly_rent": "800.00",
                "deposit_amount": "800.00",
                "payment_due_day": 1,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        lease = Lease.objects.get(pk=response.data["id"])

        self.assertEqual(lease.status, LeaseStatus.DRAFT)
        self.assertEqual(lease.tenant.user.role, UserRole.TENANT)
        self.assertFalse(lease.tenant.user.has_usable_password())
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["tenant@example.com"])
        self.assertNotIn("Distinct-Tenant-Password-9031", mail.outbox[0].body)
        self.assertEqual(
            list(lease.status_history.values_list("new_status", flat=True)),
            [LeaseStatus.DRAFT],
        )

        setup_url = next(
            line
            for line in mail.outbox[0].body.splitlines()
            if "/set-password/?" in line
        )
        query = parse_qs(urlsplit(setup_url).query)
        response = self.client.post(
            reverse("accounts:tenant-password-setup"),
            {
                "uid": query["uid"][0],
                "token": query["token"][0],
                "new_password": "Distinct-Tenant-Password-9031",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        lease.tenant.user.refresh_from_db()
        self.assertTrue(
            lease.tenant.user.check_password("Distinct-Tenant-Password-9031")
        )

    def test_model_serializer_and_service_reject_overlapping_leases(self):
        first_lease = self.create_lease()
        LeaseService.submit_for_approval(first_lease, changed_by=self.owner)
        LeaseService.approve_lease(first_lease, approved_by=self.owner)
        second_application = self.create_application()
        start_date = first_lease.start_date + timedelta(days=30)
        end_date = first_lease.end_date + timedelta(days=30)

        overlapping_lease = Lease(
            tenant=first_lease.tenant,
            unit=self.unit,
            application=second_application,
            start_date=start_date,
            end_date=end_date,
            monthly_rent=Decimal("800.00"),
            deposit_amount=Decimal("800.00"),
            payment_due_day=1,
        )
        with self.assertRaises(DjangoValidationError):
            overlapping_lease.full_clean()

        serializer = LeaseSerializer(
            data={
                "application": str(second_application.pk),
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "monthly_rent": "800.00",
                "deposit_amount": "800.00",
                "payment_due_day": 1,
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("start_date", serializer.errors)

        with self.assertRaises(ConflictErrorResponse):
            LeaseService.create_lease(
                created_by=self.owner,
                application=second_application,
                start_date=start_date,
                end_date=end_date,
                monthly_rent=Decimal("800.00"),
                deposit_amount=Decimal("800.00"),
                payment_due_day=1,
            )

    def test_approval_and_activation_update_unit_and_listing_atomically(self):
        lease = self.create_lease()

        for action in ("submit-for-approval", "approve", "activate"):
            response = self.client.post(
                reverse(
                    f"leases:lease-{action}",
                    kwargs={"pk": lease.pk},
                ),
                {},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
            lease.refresh_from_db()

        self.unit.refresh_from_db()
        self.listing.refresh_from_db()
        lease.tenant.refresh_from_db()

        self.assertEqual(lease.approved_by, self.owner)
        self.assertIsNotNone(lease.approved_at)
        self.assertEqual(lease.status, LeaseStatus.ACTIVE)
        self.assertEqual(self.unit.status, UnitStatus.OCCUPIED)
        self.assertEqual(self.listing.status, ListingStatus.CLOSED)
        self.assertEqual(lease.tenant.status, TenantStatus.ACTIVE)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.LEASE_APPROVED,
                object_id=str(lease.pk),
                user=self.owner,
            ).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.LEASE_ACTIVATED,
                object_id=str(lease.pk),
                user=self.owner,
            ).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.LISTING_CLOSED,
                object_id=str(self.listing.pk),
            ).exists()
        )
        self.assertEqual(
            Notification.objects.filter(
                user=lease.tenant.user,
                type=NotificationType.LEASE,
            ).count(),
            2,
        )
        self.assertEqual(
            list(lease.status_history.values_list("new_status", flat=True)),
            [
                LeaseStatus.DRAFT,
                LeaseStatus.PENDING_APPROVAL,
                LeaseStatus.APPROVED,
                LeaseStatus.ACTIVE,
            ],
        )

    def test_renewal_creates_successor_lease_and_keeps_unit_occupied(self):
        lease = self.activate_lease(self.create_lease())
        new_end_date = lease.end_date + timedelta(days=365)

        successor = LeaseService.renew_lease(
            lease,
            new_end_date=new_end_date,
            changed_by=self.owner,
        )
        lease.refresh_from_db()
        self.assertEqual(lease.status, LeaseStatus.RENEWED)
        self.assertEqual(successor.status, LeaseStatus.PENDING_APPROVAL)
        self.assertEqual(successor.start_date, lease.end_date + timedelta(days=1))
        self.assertEqual(successor.tenant_id, lease.tenant_id)
        self.assertEqual(successor.unit_id, lease.unit_id)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.LEASE_RENEWED,
                object_id=str(lease.pk),
                user=self.owner,
            ).exists()
        )

        LeaseService.approve_lease(successor, approved_by=self.owner)
        successor = LeaseService.activate_lease(successor, changed_by=self.owner)
        self.unit.refresh_from_db()
        self.listing.refresh_from_db()

        self.assertEqual(successor.status, LeaseStatus.ACTIVE)
        self.assertEqual(self.unit.status, UnitStatus.OCCUPIED)
        self.assertEqual(self.listing.status, ListingStatus.CLOSED)

    def test_termination_releases_unit_but_does_not_reopen_listing(self):
        lease = self.activate_lease(self.create_lease())

        lease = LeaseService.terminate_lease(
            lease,
            changed_by=self.owner,
            change_reason="Tenant moved out.",
        )
        self.unit.refresh_from_db()
        self.listing.refresh_from_db()
        lease.tenant.refresh_from_db()

        self.assertEqual(lease.status, LeaseStatus.TERMINATED)
        self.assertEqual(self.unit.status, UnitStatus.AVAILABLE)
        self.assertEqual(self.listing.status, ListingStatus.CLOSED)
        self.assertEqual(lease.tenant.status, TenantStatus.MOVED_OUT)

    def test_expiry_is_rejected_before_end_date(self):
        lease = self.activate_lease(self.create_lease())
        with self.assertRaises(ConflictErrorResponse):
            LeaseService.expire_lease(lease)

    def test_expiry_releases_unit_after_end_date(self):
        today = timezone.localdate()
        lease = self.activate_lease(
            self.create_lease(
                start_date=today - timedelta(days=365),
                end_date=today - timedelta(days=1),
            )
        )
        lease = LeaseService.expire_lease(lease)
        self.unit.refresh_from_db()
        self.listing.refresh_from_db()
        self.assertEqual(lease.status, LeaseStatus.EXPIRED)
        self.assertEqual(self.unit.status, UnitStatus.AVAILABLE)
        self.assertEqual(self.listing.status, ListingStatus.CLOSED)

    def test_renewal_alerts_are_due_at_90_60_and_30_days_and_idempotent(self):
        today = timezone.localdate()
        lease = self.activate_lease(
            self.create_lease(end_date=today + timedelta(days=90))
        )

        first_run = RenewalService.generate_renewal_alerts(today=today)
        repeat_run = RenewalService.generate_renewal_alerts(today=today)
        final_run = RenewalService.generate_renewal_alerts(today=lease.end_date)

        self.assertEqual(len(first_run), 1)
        self.assertEqual(len(repeat_run), 0)
        self.assertEqual(len(final_run), 2)
        self.assertEqual(
            set(
                RenewalAlert.objects.filter(lease=lease).values_list(
                    "days_before_expiry",
                    flat=True,
                )
            ),
            {90, 60, 30},
        )
        lease.refresh_from_db()
        self.assertEqual(lease.status, LeaseStatus.EXPIRING)
        self.assertEqual(
            LeaseStatusHistory.objects.filter(
                lease=lease,
                new_status=LeaseStatus.EXPIRING,
            ).count(),
            1,
        )
        self.assertEqual(
            Notification.objects.filter(
                user=lease.tenant.user,
                type=NotificationType.RENEWAL,
            ).count(),
            3,
        )

        alert = RenewalAlert.objects.get(
            lease=lease,
            days_before_expiry=90,
        )
        read_response = self.client.post(
            reverse(
                "leases:renewal-alert-mark-read",
                kwargs={"pk": alert.pk},
            ),
            {},
            format="json",
        )
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        self.assertEqual(read_response.data["status"], RenewalAlertStatus.READ)

        resolve_response = self.client.post(
            reverse(
                "leases:renewal-alert-resolve",
                kwargs={"pk": alert.pk},
            ),
            {},
            format="json",
        )
        self.assertEqual(resolve_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            resolve_response.data["status"],
            RenewalAlertStatus.RESOLVED,
        )

    def test_renewal_generation_endpoint_persists_alerts_idempotently(self):
        today = timezone.localdate()
        lease = self.activate_lease(
            self.create_lease(end_date=today + timedelta(days=90))
        )
        url = reverse("leases:renewal-alert-generate")

        response = self.client.post(url, {}, format="json")
        repeated_response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(repeated_response.data, [])
        self.assertTrue(
            RenewalAlert.objects.filter(
                lease=lease,
                days_before_expiry=90,
            ).exists()
        )
        lease.refresh_from_db()
        self.assertEqual(lease.status, LeaseStatus.EXPIRING)

    def test_renewal_generation_is_scoped_to_assigned_properties(self):
        today = timezone.localdate()
        lease = self.activate_lease(
            self.create_lease(end_date=today + timedelta(days=60))
        )
        manager = User.objects.create_user(
            email="unassigned-manager@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        self.client.force_authenticate(manager)

        response = self.client.post(
            reverse("leases:renewal-alert-generate"),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
        lease.refresh_from_db()
        self.assertEqual(lease.status, LeaseStatus.ACTIVE)
        self.assertFalse(RenewalAlert.objects.filter(lease=lease).exists())

    def test_tenant_can_only_read_own_lease(self):
        lease = self.activate_lease(self.create_lease())
        self.client.force_authenticate(lease.tenant.user)

        detail_response = self.client.get(
            reverse("leases:lease-detail", kwargs={"pk": lease.pk})
        )
        list_response = self.client.get(reverse("leases:lease-list"))
        create_response = self.client.post(reverse("leases:lease-list"), {})

        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["id"], str(lease.pk))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data["results"]), 1)
        self.assertEqual(create_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_tenant_profile_cannot_be_reassigned_to_another_user(self):
        lease = self.create_lease()
        original_user_id = lease.tenant.user_id
        other_user = User.objects.create_user(
            email="leases-other-tenant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )

        response = self.client.patch(
            reverse("leases:tenant-detail", kwargs={"pk": lease.tenant_id}),
            {"user": str(other_user.pk)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        lease.tenant.refresh_from_db()
        self.assertEqual(lease.tenant.user_id, original_user_id)

    def test_property_manager_access_is_scoped_to_assigned_properties(self):
        lease = self.create_lease()
        manager = User.objects.create_user(
            email="leases-manager@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        PropertyAssignment.objects.create(
            property_id=self.property.pk,
            manager=manager,
        )
        TeamMembership.objects.create(owner=self.owner, user=manager)
        self.client.force_authenticate(manager)

        response = self.client.get(
            reverse("leases:lease-detail", kwargs={"pk": lease.pk})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        unassigned_manager = User.objects.create_user(
            email="leases-unassigned-manager@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        self.client.force_authenticate(unassigned_manager)
        denied_response = self.client.get(
            reverse("leases:lease-detail", kwargs={"pk": lease.pk})
        )
        self.assertEqual(denied_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_non_manager_and_anonymous_users_cannot_access_lease_data(self):
        accountant = User.objects.create_user(
            email="leases-accountant@example.com",
            password="test-password",
            role=UserRole.ACCOUNTANT,
        )
        self.client.force_authenticate(accountant)
        forbidden_response = self.client.get(reverse("leases:lease-list"))
        self.assertEqual(forbidden_response.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=None)
        anonymous_response = self.client.get(reverse("leases:lease-list"))
        self.assertEqual(
            anonymous_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
