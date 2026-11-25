from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import PropertyAssignment, User
from apps.audit.models import AuditLog
from apps.listings.services.listing_service import ListingService
from apps.notifications.models import Notification
from apps.properties.models import Property, Unit
from common.constants import (
    ApplicationStatus,
    AuditAction,
    EmploymentStatus,
    NotificationType,
    PropertyStatus,
    ScreeningStatus,
    UnitStatus,
    UserRole,
)

from ..models import Applicant, RentalApplication, Screening


class ApplicationsApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="applications-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        self.property = Property.objects.create(
            owner=self.owner,
            name="Application Test Property",
            code="APP-TEST-01",
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
            title="Application Test Listing",
            description="A test listing.",
            rent_amount=Decimal("800.00"),
            deposit_amount=Decimal("800.00"),
            available_date=timezone.localdate() + timedelta(days=30),
        )
        self.listing = ListingService.publish_listing(draft)
        self.client.force_authenticate(self.owner)

    def applicant_payload(self, email="applicant@example.com"):
        return {
            "first_name": "Amina",
            "last_name": "Applicant",
            "email": email,
            "phone": "+252610000000",
            "employment_status": EmploymentStatus.EMPLOYED,
            "employer_name": "Example Employer",
            "monthly_income": "1500.00",
            "current_address": "Current address in Mogadishu",
        }

    def application_payload(self, email="applicant@example.com"):
        return {
            "listing": str(self.listing.pk),
            "applicant": self.applicant_payload(email=email),
            "move_in_date": (timezone.localdate() + timedelta(days=30)).isoformat(),
            "notes": "Application notes",
        }

    def submit_application(self, email="applicant@example.com"):
        response = self.client.post(
            reverse("applications:application-list"),
            self.application_payload(email=email),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data["id"]

    def start_screening(self, email="applicant@example.com"):
        application_id = self.submit_application(email=email)
        review_response = self.client.post(
            reverse("applications:application-review", kwargs={"pk": application_id}),
            {},
            format="json",
        )
        self.assertEqual(review_response.status_code, status.HTTP_200_OK)
        screening_response = self.client.post(
            reverse(
                "applications:application-start-screening",
                kwargs={"pk": application_id},
            ),
            {},
            format="json",
        )
        self.assertEqual(screening_response.status_code, status.HTTP_200_OK)
        screening = Screening.objects.get(application_id=application_id)
        start_response = self.client.post(
            reverse("applications:screening-start", kwargs={"pk": screening.pk}),
            {},
            format="json",
        )
        self.assertEqual(start_response.status_code, status.HTTP_200_OK)
        return application_id, screening

    def test_application_submission(self):
        response = self.client.post(
            reverse("applications:application-list"),
            self.application_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        application = RentalApplication.objects.get(pk=response.data["id"])
        self.assertEqual(application.status, ApplicationStatus.SUBMITTED)
        self.assertEqual(application.applicant.email, "applicant@example.com")

    def test_duplicate_active_application_is_rejected_by_email(self):
        self.submit_application()

        response = self.client.post(
            reverse("applications:application-list"),
            self.application_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(Applicant.objects.count(), 1)

    def test_move_in_date_must_not_be_in_the_past(self):
        payload = self.application_payload()
        payload["move_in_date"] = (
            timezone.localdate() - timedelta(days=1)
        ).isoformat()

        response = self.client.post(
            reverse("applications:application-list"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("move_in_date", response.data)

    def test_screening_is_created_when_application_enters_screening(self):
        application_id = self.submit_application()
        self.client.post(
            reverse("applications:application-review", kwargs={"pk": application_id}),
            {},
            format="json",
        )
        response = self.client.post(
            reverse(
                "applications:application-start-screening",
                kwargs={"pk": application_id},
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        screening = Screening.objects.get(application_id=application_id)
        self.assertEqual(screening.status, ScreeningStatus.PENDING)
        self.assertEqual(
            response.data["screening"]["id"],
            str(screening.pk),
        )

    def test_screening_pass(self):
        _, screening = self.start_screening()

        response = self.client.post(
            reverse("applications:screening-pass", kwargs={"pk": screening.pk}),
            {
                "score": 92,
                "income_verified": True,
                "employment_verified": True,
                "references_checked": True,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        screening.refresh_from_db()
        self.assertEqual(screening.status, ScreeningStatus.PASSED)
        self.assertEqual(screening.score, 92)
        self.assertEqual(screening.reviewed_by, self.owner)
        self.assertIsNotNone(screening.reviewed_at)

    def test_screening_fail(self):
        _, screening = self.start_screening()

        response = self.client.post(
            reverse("applications:screening-fail", kwargs={"pk": screening.pk}),
            {"score": 35, "notes": "Employment could not be verified."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        screening.refresh_from_db()
        self.assertEqual(screening.status, ScreeningStatus.FAILED)
        self.assertEqual(screening.score, 35)

    def test_application_approval_requires_passed_screening(self):
        application_id, screening = self.start_screening()
        attempt = self.client.post(
            reverse("applications:application-approve", kwargs={"pk": application_id}),
            {},
            format="json",
        )
        self.assertEqual(attempt.status_code, status.HTTP_409_CONFLICT)

        self.client.post(
            reverse("applications:screening-pass", kwargs={"pk": screening.pk}),
            {"score": 90},
            format="json",
        )
        applicant_user = User.objects.create_user(
            email="applicant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        response = self.client.post(
            reverse("applications:application-approve", kwargs={"pk": application_id}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ApplicationStatus.APPROVED)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.APPLICATION_APPROVED,
                object_id=application_id,
                user=self.owner,
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=applicant_user,
                type=NotificationType.SYSTEM,
            ).exists()
        )

    def test_application_rejection_requires_reason(self):
        application_id, screening = self.start_screening()
        self.client.post(
            reverse("applications:screening-fail", kwargs={"pk": screening.pk}),
            {"score": 20},
            format="json",
        )

        response = self.client.post(
            reverse("applications:application-reject", kwargs={"pk": application_id}),
            {"rejection_reason": "   "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        applicant_user = User.objects.create_user(
            email="applicant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        response = self.client.post(
            reverse("applications:application-reject", kwargs={"pk": application_id}),
            {"rejection_reason": "Screening requirements were not met."},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ApplicationStatus.REJECTED)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.APPLICATION_REJECTED,
                object_id=application_id,
                user=self.owner,
            ).exists()
        )
        self.assertTrue(
            Notification.objects.filter(
                user=applicant_user,
                type=NotificationType.SYSTEM,
            ).exists()
        )

    def test_withdrawal_is_allowed_before_screening(self):
        application_id = self.submit_application()

        response = self.client.post(
            reverse("applications:application-withdraw", kwargs={"pk": application_id}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], ApplicationStatus.WITHDRAWN)

    def test_anonymous_user_can_submit_without_access_to_review_data(self):
        self.client.force_authenticate(user=None)
        response = self.client.post(
            reverse("applications:application-list"),
            self.application_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("screening", response.data)
        detail_response = self.client.get(
            reverse(
                "applications:application-detail",
                kwargs={"pk": response.data["id"]},
            )
        )
        self.assertEqual(detail_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_non_manager_cannot_view_applications_or_screenings(self):
        tenant = User.objects.create_user(
            email="applications-tenant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        self.client.force_authenticate(tenant)

        applications_response = self.client.get(
            reverse("applications:application-list")
        )
        screenings_response = self.client.get(
            reverse("applications:screening-list")
        )

        self.assertEqual(applications_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(screenings_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_and_assigned_manager_application_scoping(self):
        other_owner = User.objects.create_user(
            email="other-applications-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        other_property = Property.objects.create(
            owner=other_owner,
            name="Other Application Property",
            code="APP-TEST-02",
            address="200 Test Street",
            city="Hargeisa",
            country="Somalia",
            status=PropertyStatus.ACTIVE,
        )
        other_unit = Unit.objects.create(
            property=other_property,
            unit_number="B-201",
            floor=2,
            bedrooms=1,
            bathrooms=Decimal("1.00"),
            square_meters=Decimal("55.00"),
            rent_amount=Decimal("600.00"),
            deposit_amount=Decimal("600.00"),
            status=UnitStatus.AVAILABLE,
        )
        other_draft = ListingService.create_listing(
            created_by=other_owner,
            unit=other_unit,
            title="Other owner's listing",
            description="",
            rent_amount=Decimal("600.00"),
            deposit_amount=Decimal("600.00"),
            available_date=timezone.localdate() + timedelta(days=30),
        )
        other_listing = ListingService.publish_listing(other_draft)

        response = self.client.post(
            reverse("applications:application-list"),
            {
                **self.application_payload(email="shared-applicant@example.com"),
                "listing": str(other_listing.pk),
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        application_id = response.data["id"]

        owner_response = self.client.get(
            reverse(
                "applications:application-detail",
                kwargs={"pk": application_id},
            )
        )
        self.assertEqual(owner_response.status_code, status.HTTP_404_NOT_FOUND)

        manager = User.objects.create_user(
            email="assigned-applications-manager@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        PropertyAssignment.objects.create(
            property_id=other_property.pk,
            manager=manager,
        )
        self.client.force_authenticate(manager)
        manager_response = self.client.get(
            reverse(
                "applications:application-detail",
                kwargs={"pk": application_id},
            )
        )
        self.assertEqual(manager_response.status_code, status.HTTP_200_OK)

        unassigned_manager = User.objects.create_user(
            email="unassigned-applications-manager@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        self.client.force_authenticate(unassigned_manager)
        unassigned_response = self.client.get(
            reverse(
                "applications:application-detail",
                kwargs={"pk": application_id},
            )
        )
        self.assertEqual(unassigned_response.status_code, status.HTTP_404_NOT_FOUND)
