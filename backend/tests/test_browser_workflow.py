import os
import secrets
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from django.test import LiveServerTestCase, override_settings
from django.test.utils import skipUnless
from django.utils import timezone

from apps.accounts.models import PropertyAssignment, User
from apps.applications.models import RentalApplication, Screening
from apps.finance.models import Deposit, Invoice, Payment, PaymentAllocation, Receipt, RentCharge
from apps.leases.models import Lease, RenewalAlert
from apps.listings.models import Listing
from apps.maintenance.models import MaintenanceTicket
from apps.properties.models import Property, Unit
from common.constants import (
    ApplicationStatus,
    DepositStatus,
    LeaseStatus,
    ListingStatus,
    MaintenanceStatus,
    PaymentStatus,
    ScreeningStatus,
    UnitStatus,
    UserRole,
)


@skipUnless(
    os.getenv("OMNI_RUN_BROWSER_E2E") == "1",
    "Set OMNI_RUN_BROWSER_E2E=1 to run the real-browser workflow test.",
)
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class BrowserWorkflowE2ETests(LiveServerTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.repository_root = Path(__file__).resolve().parents[2]
        cls.frontend_dir = cls.repository_root / "frontend"
        cls.npm = shutil.which("npm")
        if cls.npm is None:
            raise RuntimeError("npm must be installed to run browser E2E tests.")
        cls.owner_email = f"owner-{secrets.token_hex(6)}@example.test"
        cls.owner_password = secrets.token_urlsafe(24)
        cls.manager_email = f"manager-{secrets.token_hex(6)}@example.test"
        cls.manager_password = secrets.token_urlsafe(24)

    def setUp(self):
        self.owner = User.objects.create_user(
            email=self.owner_email,
            password=self.owner_password,
            role=UserRole.OWNER,
        )
        self.manager = User.objects.create_user(
            email=self.manager_email,
            password=self.manager_password,
            role=UserRole.PROPERTY_MANAGER,
        )

    def test_complete_workflow_in_browser_and_database(self):
        with socket.socket() as sock:
            sock.bind(("127.0.0.1", 0))
            frontend_port = sock.getsockname()[1]

        frontend_url = f"http://127.0.0.1:{frontend_port}"
        child_environment = os.environ.copy()
        child_environment.update(
            {
                "VITE_API_BASE_URL": "/api/v1/",
                "VITE_API_PROXY_TARGET": self.live_server_url,
                "E2E_BASE_URL": frontend_url,
                "E2E_OWNER_EMAIL": self.owner_email,
                "E2E_OWNER_PASSWORD": self.owner_password,
                "E2E_MANAGER_EMAIL": self.manager_email,
                "E2E_MANAGER_PASSWORD": self.manager_password,
                "E2E_TODAY": timezone.localdate().isoformat(),
            }
        )
        frontend_process = subprocess.Popen(
            [
                self.npm,
                "run",
                "dev",
                "--",
                "--config",
                "vite.config.ts",
                "--host",
                "127.0.0.1",
                "--port",
                str(frontend_port),
                "--strictPort",
            ],
            cwd=self.frontend_dir,
            env=child_environment,
        )

        try:
            self._wait_for_frontend(frontend_process, frontend_url)
            with urllib.request.urlopen(
                f"{self.live_server_url}/api/v1/health/",
                timeout=5,
            ) as response:
                self.assertEqual(response.status, 200)
            with urllib.request.urlopen(
                f"{frontend_url}/api/v1/health/",
                timeout=5,
            ) as response:
                self.assertEqual(response.status, 200)
                self.assertIn(
                    "application/json",
                    response.headers.get("Content-Type", ""),
                )
            subprocess.run(
                [
                    self.npm,
                    "run",
                    "test:e2e",
                    "--",
                    "--config",
                    "playwright.config.ts",
                ],
                cwd=self.frontend_dir,
                env=child_environment,
                check=True,
                timeout=300,
            )
        finally:
            frontend_process.terminate()
            try:
                frontend_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                frontend_process.kill()
                frontend_process.wait(timeout=10)

        property_obj = Property.objects.get(code__startswith="E2E-")
        assignment = PropertyAssignment.objects.get(
            property_id=property_obj.pk,
            manager=self.manager,
            is_active=True,
        )
        unit = Unit.objects.get(property=property_obj)
        listing = Listing.objects.get(unit=unit)
        application = RentalApplication.objects.get(
            applicant__email__startswith="applicant-"
        )
        screening = Screening.objects.get(application=application)
        original_lease = Lease.objects.get(
            application=application,
            status=LeaseStatus.RENEWED,
        )
        successor_lease = Lease.objects.get(
            tenant=original_lease.tenant,
            unit=unit,
            status=LeaseStatus.PENDING_APPROVAL,
        )
        charge = RentCharge.objects.get(lease=original_lease)
        deposit = Deposit.objects.get(lease=original_lease)
        payment = Payment.objects.get(tenant=original_lease.tenant)
        ticket = MaintenanceTicket.objects.get(unit=unit)

        self.assertEqual(assignment.manager_id, self.manager.pk)
        self.assertEqual(unit.status, UnitStatus.OCCUPIED)
        self.assertEqual(listing.status, ListingStatus.CLOSED)
        self.assertEqual(application.status, ApplicationStatus.APPROVED)
        self.assertEqual(screening.status, ScreeningStatus.PASSED)
        self.assertEqual(original_lease.status, LeaseStatus.RENEWED)
        self.assertEqual(successor_lease.status, LeaseStatus.PENDING_APPROVAL)
        self.assertEqual(charge.balance, 0)
        self.assertTrue(Invoice.objects.filter(rent_charge=charge).exists())
        self.assertEqual(deposit.status, DepositStatus.PAID)
        self.assertEqual(payment.status, PaymentStatus.COMPLETED)
        self.assertTrue(PaymentAllocation.objects.filter(payment=payment).exists())
        self.assertTrue(Receipt.objects.filter(payment=payment).exists())
        self.assertEqual(ticket.status, MaintenanceStatus.RESOLVED)
        self.assertTrue(RenewalAlert.objects.filter(lease=original_lease).exists())

    def _wait_for_frontend(self, process, url):
        deadline = time.monotonic() + 45
        while time.monotonic() < deadline:
            if process.poll() is not None:
                self.fail(f"Vite exited before becoming ready (exit {process.returncode}).")
            try:
                with urllib.request.urlopen(url, timeout=1):
                    return
            except (urllib.error.URLError, TimeoutError):
                time.sleep(0.5)
        self.fail("Vite did not become ready within 45 seconds.")
