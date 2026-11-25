from datetime import timedelta
from decimal import Decimal

from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import PropertyAssignment, User
from apps.applications.models import Applicant, RentalApplication, Screening
from apps.finance.models import Deposit, Payment, PaymentAllocation, RentCharge
from apps.leases.models import Lease, Tenant
from apps.listings.models import Listing
from apps.maintenance.models import MaintenanceTicket
from apps.properties.models import Property, Unit
from common.constants import (
    ApplicationStatus,
    DepositStatus,
    EmploymentStatus,
    LeaseStatus,
    ListingStatus,
    MaintenanceCategory,
    MaintenancePriority,
    MaintenanceStatus,
    PaymentMethod,
    PaymentStatus,
    PropertyStatus,
    RentChargeStatus,
    ScreeningStatus,
    TenantStatus,
    UnitStatus,
    UserRole,
)


class ReportsApiTests(APITestCase):
    def setUp(self):
        today = timezone.localdate()
        self.owner = User.objects.create_user(
            email="reports-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        self.other_owner = User.objects.create_user(
            email="reports-other-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        self.manager = User.objects.create_user(
            email="reports-manager@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        self.accountant = User.objects.create_user(
            email="reports-accountant@example.com",
            password="test-password",
            role=UserRole.ACCOUNTANT,
        )
        self.tenant_user = User.objects.create_user(
            email="reports-tenant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        self.other_tenant_user = User.objects.create_user(
            email="reports-other-tenant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        self.property = Property.objects.create(
            owner=self.owner,
            name="Reports Property",
            code="REPORTS-01",
            address="100 Report Street",
            city="Mogadishu",
            country="Somalia",
            status=PropertyStatus.ACTIVE,
        )
        self.other_property = Property.objects.create(
            owner=self.other_owner,
            name="Other Reports Property",
            code="REPORTS-02",
            address="200 Other Street",
            city="Hargeisa",
            country="Somalia",
            status=PropertyStatus.ACTIVE,
        )
        PropertyAssignment.objects.create(
            property_id=self.property.pk,
            manager=self.manager,
        )

        self.occupied_unit = self._create_unit(
            self.property,
            "A-101",
            UnitStatus.OCCUPIED,
        )
        self.available_unit = self._create_unit(
            self.property,
            "A-102",
            UnitStatus.AVAILABLE,
        )
        self.listed_unit = self._create_unit(
            self.property,
            "A-103",
            UnitStatus.LISTED,
        )
        self.maintenance_unit = self._create_unit(
            self.property,
            "A-104",
            UnitStatus.MAINTENANCE,
        )
        self._create_unit(self.property, "A-105", UnitStatus.INACTIVE, is_active=False)
        other_unit = self._create_unit(
            self.other_property,
            "B-101",
            UnitStatus.OCCUPIED,
        )

        self.tenant = Tenant.objects.create(
            user=self.tenant_user,
            status=TenantStatus.ACTIVE,
        )
        self.other_tenant = Tenant.objects.create(
            user=self.other_tenant_user,
            status=TenantStatus.ACTIVE,
        )
        self.listing = self._create_listing(self.occupied_unit, "Closed")
        self.application = RentalApplication.objects.create(
            listing=self.listing,
            applicant=Applicant.objects.create(
                first_name="Amina",
                last_name="Tenant",
                email=self.tenant_user.email,
                phone="+252610000001",
                employment_status=EmploymentStatus.EMPLOYED,
                monthly_income=Decimal("2000.00"),
                current_address="Mogadishu",
            ),
            move_in_date=today,
            status=ApplicationStatus.SCREENING,
        )
        Screening.objects.create(
            application=self.application,
            status=ScreeningStatus.PENDING,
        )
        self.lease = self._create_lease(
            tenant=self.tenant,
            unit=self.occupied_unit,
            status=LeaseStatus.ACTIVE,
            end_date=today + timedelta(days=20),
        )
        self.other_lease = self._create_lease(
            tenant=self.other_tenant,
            unit=other_unit,
            status=LeaseStatus.TERMINATED,
            end_date=today - timedelta(days=10),
        )
        self._create_lease(
            tenant=self.tenant,
            unit=self.available_unit,
            status=LeaseStatus.APPROVED,
            end_date=today + timedelta(days=60),
        )
        self._create_lease(
            tenant=self.tenant,
            unit=self.available_unit,
            status=LeaseStatus.ACTIVE,
            end_date=today + timedelta(days=50),
        )
        self._create_lease(
            tenant=self.tenant,
            unit=self.listed_unit,
            status=LeaseStatus.EXPIRED,
            end_date=today - timedelta(days=10),
        )
        self._create_lease(
            tenant=self.tenant,
            unit=self.maintenance_unit,
            status=LeaseStatus.TERMINATED,
            end_date=today - timedelta(days=10),
        )
        self._create_lease(
            tenant=self.tenant,
            unit=self.maintenance_unit,
            status=LeaseStatus.RENEWED,
            end_date=today - timedelta(days=10),
        )
        self.charge = RentCharge.objects.create(
            lease=self.lease,
            billing_month=today.month,
            billing_year=today.year,
            amount=Decimal("1000.00"),
            balance=Decimal("600.00"),
            due_date=today - timedelta(days=5),
            status=RentChargeStatus.OVERDUE,
        )
        self._create_rent_charge(
            lease=self.lease,
            month=(today.month % 12) + 1,
            year=today.year + (1 if today.month == 12 else 0),
            amount=Decimal("500.00"),
            balance=Decimal("0.00"),
            due_date=today + timedelta(days=30),
            status=RentChargeStatus.PAID,
        )
        self.payment = Payment.objects.create(
            tenant=self.tenant,
            amount=Decimal("400.00"),
            payment_date=today,
            reference_number="REPORT-PAYMENT-1",
            payment_method=PaymentMethod.CASH,
            status=PaymentStatus.COMPLETED,
        )
        PaymentAllocation.objects.create(
            payment=self.payment,
            rent_charge=self.charge,
            amount_allocated=Decimal("400.00"),
        )
        self.pending_payment = Payment.objects.create(
            tenant=self.tenant,
            amount=Decimal("25.00"),
            payment_date=today,
            reference_number="REPORT-PAYMENT-2",
            payment_method=PaymentMethod.CASH,
            status=PaymentStatus.PENDING,
        )
        Payment.objects.create(
            tenant=self.other_tenant,
            amount=Decimal("75.00"),
            payment_date=today,
            reference_number="REPORT-PAYMENT-OTHER",
            payment_method=PaymentMethod.CASH,
            status=PaymentStatus.PENDING,
        )
        Deposit.objects.create(
            lease=self.lease,
            required_amount=Decimal("1000.00"),
            paid_amount=Decimal("500.00"),
            reference_number="REPORT-DEPOSIT-1",
            payment_date=today,
            payment_method=PaymentMethod.CASH,
            status=DepositStatus.PARTIALLY_PAID,
        )
        self._create_ticket(self.tenant, self.occupied_unit, MaintenanceStatus.OPEN)
        for ticket_status in (
            MaintenanceStatus.ASSIGNED,
            MaintenanceStatus.IN_PROGRESS,
            MaintenanceStatus.RESOLVED,
            MaintenanceStatus.CLOSED,
            MaintenanceStatus.CANCELLED,
        ):
            self._create_ticket(self.tenant, self.occupied_unit, ticket_status)
        self._create_ticket(self.other_tenant, other_unit, MaintenanceStatus.OPEN)

        self.client.force_authenticate(self.owner)

    @staticmethod
    def _create_unit(property_obj, unit_number, unit_status, *, is_active=True):
        return Unit.objects.create(
            property=property_obj,
            unit_number=unit_number,
            floor=1,
            bedrooms=2,
            bathrooms=Decimal("1.00"),
            square_meters=Decimal("80.00"),
            rent_amount=Decimal("1000.00"),
            deposit_amount=Decimal("1000.00"),
            status=unit_status,
            is_active=is_active,
        )

    @staticmethod
    def _create_listing(unit, suffix):
        return Listing.objects.create(
            unit=unit,
            title=f"Report listing {suffix}",
            rent_amount=Decimal("1000.00"),
            deposit_amount=Decimal("1000.00"),
            available_date=timezone.localdate(),
            status=ListingStatus.CLOSED,
        )

    @staticmethod
    def _create_lease(*, tenant, unit, status, end_date):
        listing = ReportsApiTests._create_listing(
            unit,
            f"lease-{unit.unit_number}",
        )
        application = RentalApplication.objects.create(
            listing=listing,
            applicant=Applicant.objects.create(
                first_name="Report",
                last_name="Applicant",
                email=f"{unit.unit_number.lower()}@example.com",
                phone="+252610000002",
                employment_status=EmploymentStatus.EMPLOYED,
                monthly_income=Decimal("2000.00"),
                current_address="Somalia",
            ),
            move_in_date=timezone.localdate(),
            status=ApplicationStatus.APPROVED,
        )
        return Lease.objects.create(
            tenant=tenant,
            unit=unit,
            application=application,
            start_date=timezone.localdate() - timedelta(days=30),
            end_date=end_date,
            monthly_rent=Decimal("1000.00"),
            deposit_amount=Decimal("1000.00"),
            payment_due_day=1,
            status=status,
        )

    @staticmethod
    def _create_rent_charge(*, lease, month, year, amount, balance, due_date, status):
        return RentCharge.objects.create(
            lease=lease,
            billing_month=month,
            billing_year=year,
            amount=amount,
            balance=balance,
            due_date=due_date,
            status=status,
        )

    @staticmethod
    def _create_ticket(tenant, unit, ticket_status):
        return MaintenanceTicket.objects.create(
            tenant=tenant,
            unit=unit,
            title=f"{ticket_status} ticket",
            description="Report test ticket",
            category=MaintenanceCategory.PLUMBING,
            priority=MaintenancePriority.MEDIUM,
            status=ticket_status,
        )

    def test_occupancy_and_vacancy_use_rentable_units_and_scope(self):
        response = self.client.get(reverse("reports:occupancy"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_properties"], 1)
        self.assertEqual(response.data["total_units"], 4)
        self.assertEqual(response.data["rentable_units"], 3)
        self.assertEqual(response.data["occupied_units"], 1)
        self.assertEqual(response.data["available_units"], 1)
        self.assertEqual(response.data["listed_units"], 1)
        self.assertEqual(response.data["maintenance_units"], 1)
        self.assertEqual(response.data["occupancy_rate"], "33.33")
        self.assertEqual(response.data["vacancy_rate"], "66.67")

    def test_financial_summary_aggregates_rent_and_deposit_values(self):
        response = self.client.get(reverse("reports:financial-summary"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_rent_billed"], "1500.00")
        self.assertEqual(response.data["total_rent_collected"], "400.00")
        self.assertEqual(response.data["total_outstanding_balance"], "600.00")
        self.assertEqual(response.data["total_overdue_balance"], "600.00")
        self.assertEqual(response.data["total_security_deposits"], "1000.00")
        self.assertEqual(response.data["active_deposit_balances"], "500.00")

    def test_lease_report_accepts_expiry_window_filters(self):
        response = self.client.get(
            reverse("reports:leases"),
            {"days": 30},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["active_leases"], 2)
        self.assertEqual(response.data["approved_leases"], 1)
        self.assertEqual(response.data["expired_leases"], 1)
        self.assertEqual(response.data["terminated_leases"], 1)
        self.assertEqual(response.data["renewed_leases"], 1)
        self.assertEqual(response.data["expiring_leases"], 1)
        self.assertEqual(response.data["expiring_within_days"], 30)
        wider_window = self.client.get(
            reverse("reports:leases"),
            {"days": 60},
        )
        self.assertEqual(wider_window.data["expiring_leases"], 2)
        widest_window = self.client.get(
            reverse("reports:leases"),
            {"days": 90},
        )
        self.assertEqual(widest_window.data["expiring_leases"], 2)

        invalid_response = self.client.get(
            reverse("reports:leases"),
            {"days": 45},
        )
        self.assertEqual(
            invalid_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_maintenance_report_counts_each_status(self):
        response = self.client.get(reverse("reports:maintenance"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["open_tickets"], 1)
        self.assertEqual(response.data["assigned_tickets"], 1)
        self.assertEqual(response.data["in_progress_tickets"], 1)
        self.assertEqual(response.data["resolved_tickets"], 1)
        self.assertEqual(response.data["closed_tickets"], 1)
        self.assertEqual(response.data["cancelled_tickets"], 1)

    def test_dashboard_returns_management_kpis(self):
        response = self.client.get(reverse("reports:dashboard"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["role"], UserRole.OWNER)
        self.assertEqual(response.data["metrics"]["properties_count"], 1)
        self.assertEqual(response.data["metrics"]["units_count"], 4)
        self.assertEqual(response.data["metrics"]["listings_count"], 7)
        self.assertEqual(response.data["metrics"]["applications_count"], 7)
        self.assertEqual(response.data["metrics"]["leases_count"], 6)
        self.assertEqual(response.data["metrics"]["maintenance_count"], 6)
        self.assertEqual(
            response.data["metrics"]["occupancy_rate"],
            Decimal("33.33"),
        )
        self.assertEqual(
            response.data["metrics"]["outstanding_rent"],
            Decimal("600.00"),
        )
        self.assertEqual(
            response.data["metrics"]["overdue_rent"],
            Decimal("600.00"),
        )
        self.assertEqual(response.data["metrics"]["open_tickets"], 1)

    def test_role_specific_dashboard_and_personal_tenant_summary(self):
        self.client.force_authenticate(self.accountant)
        accountant_response = self.client.get(reverse("reports:dashboard"))
        self.assertEqual(accountant_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            accountant_response.data["metrics"]["payments_count"],
            3,
        )
        self.assertEqual(
            accountant_response.data["metrics"]["deposits_count"],
            1,
        )
        self.assertEqual(
            accountant_response.data["metrics"]["collected_rent"],
            Decimal("400.00"),
        )
        self.assertEqual(
            accountant_response.data["metrics"]["overdue_charges"],
            1,
        )
        self.assertEqual(
            self.client.get(reverse("reports:occupancy")).data["total_properties"],
            2,
        )

        self.client.force_authenticate(self.manager)
        manager_response = self.client.get(reverse("reports:dashboard"))
        self.assertEqual(manager_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            manager_response.data["metrics"]["pending_screening_count"],
            1,
        )
        self.assertEqual(manager_response.data["metrics"]["renewals_count"], 2)

        self.client.force_authenticate(self.tenant_user)
        tenant_response = self.client.get(reverse("reports:dashboard"))
        self.assertEqual(tenant_response.status_code, status.HTTP_200_OK)
        self.assertEqual(tenant_response.data["role"], UserRole.TENANT)
        self.assertEqual(tenant_response.data["metrics"]["leases_count"], 6)
        self.assertEqual(tenant_response.data["metrics"]["charges_count"], 2)
        self.assertEqual(tenant_response.data["metrics"]["payments_count"], 2)
        self.assertEqual(
            tenant_response.data["metrics"]["maintenance_requests_count"],
            6,
        )
        self.assertNotIn("properties_count", tenant_response.data["metrics"])

    def test_tenant_cannot_view_aggregate_reports_but_can_view_personal_dashboard(self):
        self.client.force_authenticate(self.tenant_user)

        for route_name in (
            "reports:occupancy",
            "reports:financial-summary",
            "reports:leases",
            "reports:maintenance",
        ):
            response = self.client.get(reverse(route_name))
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        dashboard_response = self.client.get(reverse("reports:dashboard"))
        self.assertEqual(dashboard_response.status_code, status.HTTP_200_OK)

    def test_property_and_city_filters_restrict_reports(self):
        response = self.client.get(
            reverse("reports:occupancy"),
            {
                "property": str(self.other_property.pk),
                "city": "Hargeisa",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["total_properties"], 0)
        self.assertEqual(response.data["total_units"], 0)
        self.assertEqual(response.data["occupancy_rate"], "0.00")
        self.assertEqual(response.data["vacancy_rate"], "0.00")

    def test_invalid_date_filters_are_rejected(self):
        response = self.client.get(
            reverse("reports:occupancy"),
            {"start_date": "2026-02-31"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_occupancy_is_zero_when_no_rentable_units_match_filter(self):
        response = self.client.get(
            reverse("reports:occupancy"),
            {"status": UnitStatus.MAINTENANCE},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rentable_units"], 0)
        self.assertEqual(response.data["occupancy_rate"], "0.00")
        self.assertEqual(response.data["vacancy_rate"], "0.00")
