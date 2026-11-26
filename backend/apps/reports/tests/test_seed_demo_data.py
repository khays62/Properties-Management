from io import StringIO
from decimal import Decimal

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.applications.models import RentalApplication, Screening
from apps.finance.models import (
    Deposit,
    Invoice,
    Payment,
    PaymentAllocation,
    RentCharge,
)
from apps.leases.models import Lease, RenewalAlert, Tenant
from apps.listings.models import Listing
from apps.maintenance.models import MaintenanceTicket
from apps.properties.models import Property, Unit
from common.constants import (
    ApplicationStatus,
    LeaseStatus,
    ListingStatus,
    MaintenanceStatus,
    ScreeningStatus,
    UserRole,
)


@override_settings(DEBUG=True)
class SeedDemoDataCommandTests(TestCase):
    def run_seed_command(self):
        call_command("seed_demo_data", stdout=StringIO())

    def test_seed_is_linked_idempotent_and_populates_dashboard_reports(self):
        self.run_seed_command()
        self.run_seed_command()

        self.assertEqual(Property.objects.count(), 2)
        self.assertEqual(Unit.objects.count(), 5)
        self.assertEqual(Tenant.objects.count(), 3)
        self.assertEqual(
            Listing.objects.filter(status=ListingStatus.PUBLISHED).count(),
            2,
        )
        self.assertEqual(
            Listing.objects.filter(status=ListingStatus.DRAFT).count(),
            1,
        )
        self.assertEqual(
            Listing.objects.filter(status=ListingStatus.CLOSED).count(),
            3,
        )
        self.assertEqual(
            RentalApplication.objects.filter(
                status=ApplicationStatus.APPROVED
            ).count(),
            3,
        )
        self.assertEqual(
            RentalApplication.objects.filter(
                status=ApplicationStatus.REJECTED
            ).count(),
            1,
        )
        self.assertEqual(
            Screening.objects.filter(status=ScreeningStatus.PENDING).count(),
            1,
        )
        self.assertEqual(Lease.objects.filter(status=LeaseStatus.ACTIVE).count(), 1)
        self.assertEqual(Lease.objects.filter(status=LeaseStatus.EXPIRING).count(), 1)
        self.assertEqual(Lease.objects.filter(status=LeaseStatus.APPROVED).count(), 1)
        self.assertEqual(RentCharge.objects.count(), 4)
        self.assertEqual(Invoice.objects.count(), RentCharge.objects.count())
        self.assertEqual(Payment.objects.count(), 2)
        self.assertEqual(PaymentAllocation.objects.count(), 2)
        self.assertEqual(Deposit.objects.count(), 3)
        self.assertEqual(RenewalAlert.objects.count(), 2)
        self.assertEqual(
            MaintenanceTicket.objects.filter(
                status=MaintenanceStatus.OPEN
            ).count(),
            1,
        )
        self.assertEqual(
            MaintenanceTicket.objects.filter(
                status=MaintenanceStatus.IN_PROGRESS
            ).count(),
            1,
        )
        self.assertEqual(
            MaintenanceTicket.objects.filter(
                status=MaintenanceStatus.RESOLVED
            ).count(),
            1,
        )

        for invoice in Invoice.objects.select_related("rent_charge"):
            self.assertEqual(invoice.rent_charge.invoice, invoice)
        for allocation in PaymentAllocation.objects.select_related(
            "payment",
            "rent_charge__lease",
        ):
            self.assertEqual(
                allocation.payment.tenant_id,
                allocation.rent_charge.lease.tenant_id,
            )

        client = APIClient()
        owner = User.objects.get(
            email="demo.owner@omniproperties.local",
            role=UserRole.OWNER,
        )
        client.force_authenticate(user=owner)
        dashboard = client.get(reverse("reports:dashboard"))
        self.assertEqual(dashboard.status_code, 200)
        self.assertEqual(dashboard.data["metrics"]["properties_count"], 2)
        self.assertEqual(dashboard.data["metrics"]["units_count"], 5)
        self.assertEqual(
            dashboard.data["metrics"]["occupancy_rate"],
            Decimal("40.00"),
        )
        self.assertGreater(
            dashboard.data["metrics"]["outstanding_rent"],
            Decimal("0"),
        )
        self.assertGreater(
            dashboard.data["metrics"]["collected_rent"],
            Decimal("0"),
        )

        tenant = Tenant.objects.select_related("user").get(
            user__email="demo.tenant1@omniproperties.local",
        )
        client.force_authenticate(user=tenant.user)
        tenant_dashboard = client.get(reverse("reports:dashboard"))
        self.assertEqual(tenant_dashboard.status_code, 200)
        self.assertEqual(tenant_dashboard.data["role"], UserRole.TENANT)
        self.assertNotIn("properties_count", tenant_dashboard.data["metrics"])

        manager = User.objects.get(
            email="demo.manager@omniproperties.local",
            role=UserRole.PROPERTY_MANAGER,
        )
        client.force_authenticate(user=manager)
        manager_dashboard = client.get(reverse("reports:dashboard"))
        self.assertEqual(
            manager_dashboard.data["metrics"]["pending_screening_count"],
            1,
        )
        self.assertEqual(manager_dashboard.data["metrics"]["renewals_count"], 1)

        accountant = User.objects.get(
            email="demo.accountant@omniproperties.local",
            role=UserRole.ACCOUNTANT,
        )
        client.force_authenticate(user=accountant)
        accountant_dashboard = client.get(reverse("reports:dashboard"))
        self.assertEqual(accountant_dashboard.data["metrics"]["payments_count"], 2)
        self.assertEqual(accountant_dashboard.data["metrics"]["deposits_count"], 3)

    @override_settings(DEBUG=False)
    def test_seed_command_is_disabled_outside_development(self):
        with self.assertRaises(CommandError):
            self.run_seed_command()

        self.assertEqual(User.objects.count(), 0)
