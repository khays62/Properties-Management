from datetime import timedelta
from decimal import Decimal
from tempfile import TemporaryDirectory

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import PropertyAssignment, TeamMembership, User
from apps.applications.models import Applicant, RentalApplication
from apps.audit.models import AuditLog
from apps.leases.models import Lease, Tenant
from apps.listings.services.listing_service import ListingService
from apps.notifications.models import Notification
from apps.properties.models import Property, Unit
from common.constants import (
    ApplicationStatus,
    AuditAction,
    EmploymentStatus,
    LeaseStatus,
    MaintenanceActivityAction,
    MaintenanceStatus,
    NotificationType,
    PropertyStatus,
    TenantStatus,
    UnitStatus,
    UserRole,
)

from ..models import MaintenanceActivity, MaintenanceAttachment, MaintenanceTicket


class MaintenanceApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="maintenance-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        self.manager = User.objects.create_user(
            email="maintenance-manager@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        self.property = Property.objects.create(
            owner=self.owner,
            name="Maintenance Test Property",
            code="MAINT-TEST-01",
            address="100 Maintenance Street",
            city="Mogadishu",
            country="Somalia",
            status=PropertyStatus.ACTIVE,
        )
        PropertyAssignment.objects.create(
            property_id=self.property.pk,
            manager=self.manager,
        )
        TeamMembership.objects.create(owner=self.owner, user=self.manager)
        self.unit = Unit.objects.create(
            property=self.property,
            unit_number="M-101",
            floor=1,
            bedrooms=2,
            bathrooms=Decimal("1.50"),
            square_meters=Decimal("80.00"),
            rent_amount=Decimal("800.00"),
            deposit_amount=Decimal("800.00"),
            status=UnitStatus.AVAILABLE,
        )
        listing = ListingService.create_listing(
            created_by=self.owner,
            unit=self.unit,
            title="Maintenance Test Listing",
            description="A test listing.",
            rent_amount=Decimal("800.00"),
            deposit_amount=Decimal("800.00"),
            available_date=timezone.localdate(),
        )
        self.listing = ListingService.publish_listing(listing)
        self.tenant_user = User.objects.create_user(
            email="maintenance-tenant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        self.tenant = Tenant.objects.create(
            user=self.tenant_user,
            status=TenantStatus.ACTIVE,
        )
        applicant = Applicant.objects.create(
            first_name="Amina",
            last_name="Tenant",
            email=self.tenant_user.email,
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
        today = timezone.localdate()
        self.lease = Lease.objects.create(
            tenant=self.tenant,
            unit=self.unit,
            application=application,
            start_date=today - timedelta(days=30),
            end_date=today + timedelta(days=300),
            monthly_rent=Decimal("800.00"),
            deposit_amount=Decimal("800.00"),
            payment_due_day=today.day,
            status=LeaseStatus.ACTIVE,
            approved_by=self.owner,
            approved_at=timezone.now(),
        )
        self.unit.status = UnitStatus.OCCUPIED
        self.unit.save(update_fields=["status", "updated_at"])
        self.client.force_authenticate(self.tenant_user)

    def create_ticket(self):
        response = self.client.post(
            reverse("maintenance:ticket-list"),
            {
                "unit": str(self.unit.pk),
                "title": "Leaking kitchen sink",
                "description": "Water is leaking beneath the sink.",
                "category": "PLUMBING",
                "priority": "HIGH",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data["id"]

    def test_tenant_can_create_ticket_for_current_occupied_lease(self):
        ticket_id = self.create_ticket()
        ticket = MaintenanceTicket.objects.get(pk=ticket_id)

        self.assertEqual(ticket.tenant, self.tenant)
        self.assertEqual(ticket.status, MaintenanceStatus.OPEN)
        self.assertEqual(
            list(
                ticket.activities.values_list("action", flat=True)
            ),
            [MaintenanceActivityAction.CREATED],
        )

    def test_tenant_cannot_create_ticket_for_unoccupied_unit(self):
        self.unit.status = UnitStatus.AVAILABLE
        self.unit.save(update_fields=["status", "updated_at"])

        response = self.client.post(
            reverse("maintenance:ticket-list"),
            {
                "unit": str(self.unit.pk),
                "title": "Broken lock",
                "description": "The lock is not working.",
                "category": "SECURITY",
                "priority": "MEDIUM",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MaintenanceTicket.objects.count(), 0)

    def test_tenant_cannot_create_ticket_without_current_active_lease(self):
        self.lease.status = LeaseStatus.EXPIRED
        self.lease.save(update_fields=["status", "updated_at"])

        response = self.client.post(
            reverse("maintenance:ticket-list"),
            {
                "unit": str(self.unit.pk),
                "title": "Broken lock",
                "description": "The lock is not working.",
                "category": "SECURITY",
                "priority": "MEDIUM",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MaintenanceTicket.objects.count(), 0)

    def test_manager_can_assign_start_resolve_and_close_with_activities(self):
        ticket_id = self.create_ticket()
        self.client.force_authenticate(self.manager)

        assign_response = self.client.post(
            reverse("maintenance:ticket-assign", kwargs={"pk": ticket_id}),
            {"assigned_to": str(self.manager.pk)},
            format="json",
        )
        self.assertEqual(
            assign_response.status_code,
            status.HTTP_200_OK,
            assign_response.data,
        )
        start_response = self.client.post(
            reverse("maintenance:ticket-start", kwargs={"pk": ticket_id}),
            {},
            format="json",
        )
        self.assertEqual(start_response.status_code, status.HTTP_200_OK)
        resolve_response = self.client.post(
            reverse("maintenance:ticket-resolve", kwargs={"pk": ticket_id}),
            {"resolution_notes": "Replaced the damaged pipe."},
            format="json",
        )
        self.assertEqual(resolve_response.status_code, status.HTTP_200_OK)
        close_response = self.client.post(
            reverse("maintenance:ticket-close", kwargs={"pk": ticket_id}),
            {},
            format="json",
        )
        self.assertEqual(close_response.status_code, status.HTTP_200_OK)

        ticket = MaintenanceTicket.objects.get(pk=ticket_id)
        self.assertEqual(ticket.status, MaintenanceStatus.CLOSED)
        self.assertEqual(
            set(ticket.activities.values_list("action", flat=True)),
            {
                MaintenanceActivityAction.CREATED,
                MaintenanceActivityAction.ASSIGNED,
                MaintenanceActivityAction.STARTED,
                MaintenanceActivityAction.RESOLVED,
                MaintenanceActivityAction.CLOSED,
            },
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.MAINTENANCE_ASSIGNED,
                object_id=str(ticket.pk),
                user=self.manager,
            ).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.MAINTENANCE_RESOLVED,
                object_id=str(ticket.pk),
                user=self.manager,
            ).exists()
        )
        self.assertEqual(
            Notification.objects.filter(
                user=self.tenant_user,
                type=NotificationType.MAINTENANCE,
            ).count(),
            2,
        )
        self.assertEqual(
            Notification.objects.filter(
                user=self.manager,
                type=NotificationType.MAINTENANCE,
            ).count(),
            1,
        )

    def test_only_open_tickets_can_be_assigned_or_cancelled(self):
        ticket_id = self.create_ticket()
        self.client.force_authenticate(self.manager)
        start_response = self.client.post(
            reverse("maintenance:ticket-start", kwargs={"pk": ticket_id}),
            {},
            format="json",
        )
        self.assertEqual(start_response.status_code, status.HTTP_409_CONFLICT)
        self.client.post(
            reverse("maintenance:ticket-assign", kwargs={"pk": ticket_id}),
            {"assigned_to": str(self.manager.pk)},
            format="json",
        )
        cancel_response = self.client.post(
            reverse("maintenance:ticket-cancel", kwargs={"pk": ticket_id}),
            {},
            format="json",
        )
        self.assertEqual(cancel_response.status_code, status.HTTP_409_CONFLICT)

        response = self.client.post(
            reverse("maintenance:ticket-assign", kwargs={"pk": ticket_id}),
            {"assigned_to": str(self.manager.pk)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)

    def test_tenant_can_cancel_own_open_ticket_and_activity_is_recorded(self):
        ticket_id = self.create_ticket()

        response = self.client.post(
            reverse("maintenance:ticket-cancel", kwargs={"pk": ticket_id}),
            {"notes": "Issue resolved before a visit was needed."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        ticket = MaintenanceTicket.objects.get(pk=ticket_id)
        self.assertEqual(ticket.status, MaintenanceStatus.CANCELLED)
        self.assertTrue(
            ticket.activities.filter(
                action=MaintenanceActivityAction.CANCELLED,
                performed_by=self.tenant_user,
            ).exists()
        )
        repeated_response = self.client.post(
            reverse("maintenance:ticket-cancel", kwargs={"pk": ticket_id}),
            {},
            format="json",
        )
        self.assertEqual(
            repeated_response.status_code,
            status.HTTP_409_CONFLICT,
        )

    def test_manager_cannot_assign_ticket_to_unassigned_property_manager(self):
        ticket_id = self.create_ticket()
        another_manager = User.objects.create_user(
            email="maintenance-unassigned-target@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        self.client.force_authenticate(self.manager)

        response = self.client.post(
            reverse("maintenance:ticket-assign", kwargs={"pk": ticket_id}),
            {"assigned_to": str(another_manager.pk)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        ticket = MaintenanceTicket.objects.get(pk=ticket_id)
        self.assertEqual(ticket.status, MaintenanceStatus.OPEN)
        self.assertFalse(
            ticket.activities.filter(
                action=MaintenanceActivityAction.ASSIGNED,
            ).exists()
        )

    def test_ticket_update_records_activity(self):
        ticket_id = self.create_ticket()
        self.client.force_authenticate(self.manager)

        response = self.client.patch(
            reverse("maintenance:ticket-detail", kwargs={"pk": ticket_id}),
            {"priority": "URGENT"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(
            MaintenanceActivity.objects.filter(
                ticket_id=ticket_id,
                action=MaintenanceActivityAction.UPDATED,
                performed_by=self.manager,
            ).exists()
        )

    def test_other_tenant_and_unassigned_manager_cannot_view_ticket(self):
        ticket_id = self.create_ticket()
        another_tenant = User.objects.create_user(
            email="maintenance-other-tenant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        Tenant.objects.create(user=another_tenant, status=TenantStatus.ACTIVE)
        self.client.force_authenticate(another_tenant)
        tenant_response = self.client.get(
            reverse("maintenance:ticket-detail", kwargs={"pk": ticket_id})
        )
        self.assertEqual(tenant_response.status_code, status.HTTP_404_NOT_FOUND)
        cancel_response = self.client.post(
            reverse("maintenance:ticket-cancel", kwargs={"pk": ticket_id}),
            {},
            format="json",
        )
        self.assertEqual(cancel_response.status_code, status.HTTP_404_NOT_FOUND)

        another_manager = User.objects.create_user(
            email="maintenance-unassigned@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        self.client.force_authenticate(another_manager)
        manager_response = self.client.get(
            reverse("maintenance:ticket-detail", kwargs={"pk": ticket_id})
        )
        self.assertEqual(manager_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_accountant_cannot_access_maintenance(self):
        accountant = User.objects.create_user(
            email="maintenance-accountant@example.com",
            password="test-password",
            role=UserRole.ACCOUNTANT,
        )
        self.client.force_authenticate(accountant)

        response = self.client.get(reverse("maintenance:ticket-list"))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_attachment_upload_validates_extension_and_size(self):
        ticket_id = self.create_ticket()
        with TemporaryDirectory() as media_root:
            with override_settings(MEDIA_ROOT=media_root):
                valid_response = self.client.post(
                    reverse("maintenance:attachment-list"),
                    {
                        "ticket": ticket_id,
                        "file": SimpleUploadedFile(
                            "photo.jpg",
                            b"jpeg test content",
                            content_type="image/jpeg",
                        ),
                    },
                    format="multipart",
                )
                self.assertEqual(
                    valid_response.status_code,
                    status.HTTP_201_CREATED,
                    valid_response.data,
                )

                invalid_extension_response = self.client.post(
                    reverse("maintenance:attachment-list"),
                    {
                        "ticket": ticket_id,
                        "file": SimpleUploadedFile(
                            "script.exe",
                            b"not allowed",
                            content_type="application/octet-stream",
                        ),
                    },
                    format="multipart",
                )
                self.assertEqual(
                    invalid_extension_response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )

                oversized_response = self.client.post(
                    reverse("maintenance:attachment-list"),
                    {
                        "ticket": ticket_id,
                        "file": SimpleUploadedFile(
                            "large.pdf",
                            b"x" * (5 * 1024 * 1024 + 1),
                            content_type="application/pdf",
                        ),
                    },
                    format="multipart",
                )
                self.assertEqual(
                    oversized_response.status_code,
                    status.HTTP_400_BAD_REQUEST,
                )

        self.assertEqual(MaintenanceAttachment.objects.count(), 1)

