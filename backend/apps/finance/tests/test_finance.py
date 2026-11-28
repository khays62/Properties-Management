from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import PropertyAssignment, TeamMembership, User
from apps.applications.models import Applicant, RentalApplication, Screening
from apps.audit.models import AuditLog
from apps.leases.models import Lease, Tenant
from apps.leases.services.lease_service import LeaseService
from apps.listings.services.listing_service import ListingService
from apps.notifications.models import Notification
from apps.properties.models import Property, Unit
from common.constants import (
    ApplicationStatus,
    AuditAction,
    DepositStatus,
    EmploymentStatus,
    LeaseStatus,
    NotificationType,
    PaymentMethod,
    PaymentStatus,
    PropertyStatus,
    RentChargeStatus,
    ScreeningStatus,
    TenantStatus,
    UnitStatus,
    UserRole,
)

from ..models import (
    Deposit,
    Payment,
    Receipt,
    RentCharge,
    RentSchedule,
)
from ..selectors.deposit_selector import DepositSelector
from ..selectors.rent_charge_selector import RentChargeSelector
from ..services.deposit_service import DepositService
from ..services.receipt_service import ReceiptService
from ..services.rent_charge_service import RentChargeService


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
)
class FinanceApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="finance-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        self.property = Property.objects.create(
            owner=self.owner,
            name="Finance Test Property",
            code="FIN-TEST-01",
            address="100 Finance Street",
            city="Mogadishu",
            country="Somalia",
            status=PropertyStatus.ACTIVE,
        )
        self.unit = Unit.objects.create(
            property=self.property,
            unit_number="F-101",
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
            title="Finance Test Listing",
            description="A test listing.",
            rent_amount=Decimal("800.00"),
            deposit_amount=Decimal("800.00"),
            available_date=timezone.localdate(),
        )
        self.listing = ListingService.publish_listing(listing)
        applicant = Applicant.objects.create(
            first_name="Amina",
            last_name="Tenant",
            email="finance-tenant@example.com",
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
        today = timezone.localdate()
        start_date = today.replace(day=1)
        self.lease = LeaseService.create_lease(
            created_by=self.owner,
            application=application,
            start_date=start_date,
            end_date=start_date + timedelta(days=400),
            monthly_rent=Decimal("800.00"),
            deposit_amount=Decimal("800.00"),
            payment_due_day=today.day,
        )
        LeaseService.submit_for_approval(self.lease, changed_by=self.owner)
        LeaseService.approve_lease(self.lease, approved_by=self.owner)
        self.lease = LeaseService.activate_lease(
            self.lease,
            changed_by=self.owner,
        )
        self.tenant = self.lease.tenant
        self.client.force_authenticate(self.owner)
        schedule_response = self.client.post(
            reverse("finance:rent-schedule-list"),
            {"lease": str(self.lease.pk)},
            format="json",
        )
        self.assertEqual(
            schedule_response.status_code,
            status.HTTP_201_CREATED,
            schedule_response.data,
        )
        self.schedule = RentSchedule.objects.get(pk=schedule_response.data["id"])
        self.assertEqual(len(mail.outbox), 1)

    @staticmethod
    def current_billing_period():
        today = timezone.localdate()
        return today.month, today.year

    @staticmethod
    def next_billing_period(month, year):
        return (1, year + 1) if month == 12 else (month + 1, year)

    def create_charge(self, month=None, year=None):
        if month is None or year is None:
            month, year = self.current_billing_period()
        return RentChargeService.generate_monthly_charge(
            self.schedule,
            billing_month=month,
            billing_year=year,
            created_by=self.owner,
        )

    def create_payment(self, *, amount, reference_number):
        response = self.client.post(
            reverse("finance:payment-list"),
            {
                "tenant": str(self.tenant.pk),
                "amount": str(amount),
                "payment_date": timezone.localdate().isoformat(),
                "reference_number": reference_number,
                "payment_method": PaymentMethod.MOBILE_MONEY,
                "notes": "Test payment",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data["id"]

    def allocate_payment(self, payment_id, allocations):
        response = self.client.post(
            reverse("finance:payment-allocate", kwargs={"pk": payment_id}),
            {"allocations": allocations},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response

    def test_deposit_payments_are_separate_from_rent(self):
        charge = self.create_charge()
        response = self.client.post(
            reverse("finance:deposit-list"),
            {"lease": str(self.lease.pk)},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        deposit_id = response.data["id"]

        for amount, reference in (
            ("300.00", "DEP-REF-001"),
            ("500.00", "DEP-REF-002"),
        ):
            payment_response = self.client.post(
                reverse("finance:deposit-record-payment", kwargs={"pk": deposit_id}),
                {
                    "amount": amount,
                    "reference_number": reference,
                    "payment_date": timezone.localdate().isoformat(),
                    "payment_method": PaymentMethod.CASH,
                },
                format="json",
            )
            self.assertEqual(
                payment_response.status_code,
                status.HTTP_200_OK,
                payment_response.data,
            )

        deposit = Deposit.objects.get(pk=deposit_id)
        charge.refresh_from_db()
        self.assertEqual(deposit.paid_amount, Decimal("800.00"))
        self.assertEqual(deposit.status, DepositStatus.PAID)
        self.assertEqual(charge.balance, Decimal("800.00"))
        self.assertEqual(
            DepositSelector.get_outstanding_total(user=self.owner),
            Decimal("0.00"),
        )

    def test_deposit_refund_supports_partial_and_full_refunds(self):
        deposit = DepositService.create_deposit(
            lease=self.lease,
            created_by=self.owner,
        )
        DepositService.record_deposit_payment(
            deposit,
            amount=Decimal("800.00"),
            reference_number="DEP-REFUND-001",
            payment_method=PaymentMethod.BANK_TRANSFER,
            recorded_by=self.owner,
        )

        partial_response = self.client.post(
            reverse("finance:deposit-refund", kwargs={"pk": deposit.pk}),
            {"amount": "250.00"},
            format="json",
        )
        self.assertEqual(partial_response.status_code, status.HTTP_200_OK)
        deposit.refresh_from_db()
        self.assertEqual(deposit.paid_amount, Decimal("550.00"))
        self.assertEqual(deposit.status, DepositStatus.PARTIALLY_REFUNDED)

        full_response = self.client.post(
            reverse("finance:deposit-refund", kwargs={"pk": deposit.pk}),
            {},
            format="json",
        )
        self.assertEqual(full_response.status_code, status.HTTP_200_OK)
        deposit.refresh_from_db()
        self.assertEqual(deposit.paid_amount, Decimal("0.00"))
        self.assertEqual(deposit.status, DepositStatus.REFUNDED)

    def test_monthly_charge_generation_uses_lease_rent_and_schedule_day(self):
        month, year = self.current_billing_period()
        response = self.client.post(
            reverse("finance:rent-charge-generate"),
            {"billing_month": month, "billing_year": year},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(len(response.data), 1)
        charge = RentCharge.objects.get(lease=self.lease)
        self.assertEqual(charge.amount, Decimal("800.00"))
        self.assertEqual(charge.balance, charge.amount)
        self.assertEqual(charge.due_date.day, self.schedule.due_day)
        self.assertEqual(charge.status, RentChargeStatus.PENDING)
        self.assertEqual(
            response.data[0]["lease_label"],
            "Amina Tenant - Unit F-101 - Finance Test Property",
        )
        self.assertEqual(response.data[0]["tenant_name"], "Amina Tenant")

    def test_finance_associations_use_human_readable_labels(self):
        schedule_response = self.client.get(
            reverse("finance:rent-schedule-detail", kwargs={"pk": self.schedule.pk})
        )
        self.assertEqual(schedule_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            schedule_response.data["lease_label"],
            "Amina Tenant - Unit F-101 - Finance Test Property",
        )

        deposit = DepositService.create_deposit(
            lease=self.lease,
            created_by=self.owner,
        )
        deposit_response = self.client.get(
            reverse("finance:deposit-detail", kwargs={"pk": deposit.pk})
        )
        self.assertEqual(deposit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            deposit_response.data["lease_label"],
            "Amina Tenant - Unit F-101 - Finance Test Property",
        )

        charge = self.create_charge()
        payment_id = self.create_payment(
            amount=Decimal("100.00"),
            reference_number="PAY-LABEL-001",
        )
        allocation_response = self.allocate_payment(
            payment_id,
            [{"rent_charge": str(charge.pk), "amount_allocated": "100.00"}],
        )
        self.assertEqual(
            allocation_response.data["allocations"][0]["rent_charge_label"],
            "Amina Tenant - Unit F-101 - Finance Test Property - "
            f"{charge.billing_month}/{charge.billing_year}",
        )
        self.assertEqual(allocation_response.data["tenant_name"], "Amina Tenant")

        receipt_response = self.client.get(reverse("finance:receipt-list"))
        self.assertEqual(receipt_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            receipt_response.data["results"][0]["payment_reference_number"],
            "PAY-LABEL-001",
        )
        self.assertEqual(
            receipt_response.data["results"][0]["tenant_name"],
            "Amina Tenant",
        )
        charge_filter_response = self.client.get(
            reverse("finance:rent-charge-list"),
            {"tenant": "Amina Tenant"},
        )
        self.assertEqual(charge_filter_response.data["count"], 1)
        lease_filter_response = self.client.get(
            reverse("finance:rent-charge-list"),
            {"lease": "Finance Test Property"},
        )
        self.assertEqual(lease_filter_response.data["count"], 1)
        payment_filter_response = self.client.get(
            reverse("finance:payment-list"),
            {"tenant": "Amina Tenant"},
        )
        self.assertEqual(payment_filter_response.data["count"], 1)
        receipt_filter_response = self.client.get(
            reverse("finance:receipt-list"),
            {"payment": "PAY-LABEL-001"},
        )
        self.assertEqual(receipt_filter_response.data["count"], 1)

    def test_invoice_issue_endpoint_persists_idempotent_invoice(self):
        from ..models import Invoice

        charge = self.create_charge()
        url = reverse(
            "finance:rent-charge-issue-invoice",
            kwargs={"pk": charge.pk},
        )

        response = self.client.post(url, {}, format="json")
        repeated_response = self.client.post(url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(repeated_response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], repeated_response.data["id"])
        invoice = Invoice.objects.get(rent_charge=charge)
        self.assertEqual(invoice.invoice_number, response.data["invoice_number"])
        charge_response = self.client.get(
            reverse("finance:rent-charge-detail", kwargs={"pk": charge.pk})
        )
        self.assertEqual(charge_response.status_code, status.HTTP_200_OK)
        self.assertEqual(charge_response.data["invoice_number"], invoice.invoice_number)

    def test_invoice_issue_is_denied_to_tenant(self):
        charge = self.create_charge()
        self.client.force_authenticate(self.tenant.user)

        response = self.client.post(
            reverse(
                "finance:rent-charge-issue-invoice",
                kwargs={"pk": charge.pk},
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_duplicate_monthly_charge_generation_is_idempotent(self):
        month, year = self.current_billing_period()
        first = self.create_charge(month, year)
        second = self.create_charge(month, year)

        self.assertEqual(first.pk, second.pk)
        self.assertEqual(
            RentCharge.objects.filter(
                lease=self.lease,
                billing_month=month,
                billing_year=year,
            ).count(),
            1,
        )

    def test_partial_payment_reduces_balance_and_generates_receipt(self):
        charge = self.create_charge()
        payment_id = self.create_payment(
            amount=Decimal("250.00"),
            reference_number="PAY-PARTIAL-001",
        )

        response = self.allocate_payment(
            payment_id,
            [
                {
                    "rent_charge": str(charge.pk),
                    "amount_allocated": "250.00",
                }
            ],
        )
        charge.refresh_from_db()
        payment = Payment.objects.get(pk=payment_id)

        self.assertEqual(charge.balance, Decimal("550.00"))
        self.assertEqual(charge.status, RentChargeStatus.PARTIALLY_PAID)
        self.assertEqual(payment.status, PaymentStatus.COMPLETED)
        self.assertEqual(len(response.data["allocations"]), 1)
        self.assertTrue(Receipt.objects.filter(payment=payment).exists())
        self.assertEqual(
            RentChargeSelector.get_outstanding_balance(user=self.owner),
            Decimal("550.00"),
        )

    def test_allocation_cannot_exceed_remaining_charge_balance(self):
        charge = self.create_charge()
        payment_id = self.create_payment(
            amount=Decimal("900.00"),
            reference_number="PAY-OVERALLOCATED-001",
        )

        response = self.client.post(
            reverse("finance:payment-allocate", kwargs={"pk": payment_id}),
            {
                "allocations": [
                    {
                        "rent_charge": str(charge.pk),
                        "amount_allocated": "900.00",
                    }
                ]
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        charge.refresh_from_db()
        payment = Payment.objects.get(pk=payment_id)
        self.assertEqual(charge.balance, charge.amount)
        self.assertEqual(payment.status, PaymentStatus.PENDING)
        self.assertFalse(Receipt.objects.filter(payment=payment).exists())

    def test_full_payment_marks_charge_paid(self):
        charge = self.create_charge()
        payment_id = self.create_payment(
            amount=Decimal("800.00"),
            reference_number="PAY-FULL-001",
        )

        self.allocate_payment(
            payment_id,
            [
                {
                    "rent_charge": str(charge.pk),
                    "amount_allocated": "800.00",
                }
            ],
        )
        charge.refresh_from_db()

        self.assertEqual(charge.balance, Decimal("0.00"))
        self.assertEqual(charge.status, RentChargeStatus.PAID)

    def test_payment_can_be_split_across_rent_charges(self):
        first_month, first_year = self.current_billing_period()
        second_month, second_year = self.next_billing_period(
            first_month,
            first_year,
        )
        first_charge = self.create_charge(first_month, first_year)
        second_charge = self.create_charge(second_month, second_year)
        payment_id = self.create_payment(
            amount=Decimal("500.00"),
            reference_number="PAY-SPLIT-001",
        )

        self.allocate_payment(
            payment_id,
            [
                {
                    "rent_charge": str(first_charge.pk),
                    "amount_allocated": "250.00",
                },
                {
                    "rent_charge": str(second_charge.pk),
                    "amount_allocated": "250.00",
                },
            ],
        )
        first_charge.refresh_from_db()
        second_charge.refresh_from_db()

        self.assertEqual(first_charge.balance, Decimal("550.00"))
        self.assertEqual(second_charge.balance, Decimal("550.00"))
        self.assertEqual(first_charge.status, RentChargeStatus.PARTIALLY_PAID)
        self.assertEqual(second_charge.status, RentChargeStatus.PARTIALLY_PAID)

    def test_overdue_transition_requires_due_date_to_pass(self):
        charge = self.create_charge()
        with patch(
            "apps.finance.services.rent_charge_service.timezone.localdate",
            return_value=charge.due_date + timedelta(days=1),
        ):
            response = self.client.post(
                reverse(
                    "finance:rent-charge-mark-overdue",
                    kwargs={"pk": charge.pk},
                ),
                {},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        charge.refresh_from_db()
        self.assertEqual(charge.status, RentChargeStatus.OVERDUE)

    def test_payment_reversal_restores_charge_balance(self):
        charge = self.create_charge()
        payment_id = self.create_payment(
            amount=Decimal("300.00"),
            reference_number="PAY-REVERSAL-001",
        )
        self.allocate_payment(
            payment_id,
            [
                {
                    "rent_charge": str(charge.pk),
                    "amount_allocated": "300.00",
                }
            ],
        )

        response = self.client.post(
            reverse("finance:payment-reverse", kwargs={"pk": payment_id}),
            {},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        charge.refresh_from_db()
        payment = Payment.objects.get(pk=payment_id)

        self.assertEqual(charge.balance, charge.amount)
        self.assertEqual(charge.status, RentChargeStatus.PENDING)
        self.assertEqual(payment.status, PaymentStatus.REVERSED)
        self.assertTrue(Receipt.objects.filter(payment=payment).exists())
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.PAYMENT_CREATED,
                object_id=str(payment.pk),
                user=self.owner,
            ).exists()
        )
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.PAYMENT_REVERSED,
                object_id=str(payment.pk),
                user=self.owner,
            ).exists()
        )
        self.assertEqual(
            Notification.objects.filter(
                user=self.tenant.user,
                type=NotificationType.PAYMENT,
            ).count(),
            2,
        )

    def test_receipt_generation_is_idempotent(self):
        charge = self.create_charge()
        payment_id = self.create_payment(
            amount=Decimal("800.00"),
            reference_number="PAY-RECEIPT-001",
        )
        self.allocate_payment(
            payment_id,
            [
                {
                    "rent_charge": str(charge.pk),
                    "amount_allocated": "800.00",
                }
            ],
        )
        payment = Payment.objects.get(pk=payment_id)
        original_receipt = payment.receipt

        duplicate = ReceiptService.generate_receipt(payment)

        self.assertEqual(duplicate.pk, original_receipt.pk)
        self.assertEqual(Receipt.objects.filter(payment=payment).count(), 1)

    def test_owner_cannot_view_financial_history_spanning_unmanaged_properties(self):
        charge = self.create_charge()
        payment_id = self.create_payment(
            amount=Decimal("800.00"),
            reference_number="PAY-CROSS-PROPERTY-001",
        )
        self.allocate_payment(
            payment_id,
            [
                {
                    "rent_charge": str(charge.pk),
                    "amount_allocated": "800.00",
                }
            ],
        )

        other_owner = User.objects.create_user(
            email="finance-other-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        other_property = Property.objects.create(
            owner=other_owner,
            name="Other Finance Property",
            code="FIN-TEST-02",
            address="200 Finance Street",
            city="Mogadishu",
            country="Somalia",
            status=PropertyStatus.ACTIVE,
        )
        other_unit = Unit.objects.create(
            property=other_property,
            unit_number="F-201",
            floor=1,
            bedrooms=1,
            bathrooms=Decimal("1.00"),
            square_meters=Decimal("55.00"),
            rent_amount=Decimal("600.00"),
            deposit_amount=Decimal("600.00"),
            status=UnitStatus.AVAILABLE,
        )
        other_listing = ListingService.publish_listing(
            ListingService.create_listing(
                created_by=other_owner,
                unit=other_unit,
                title="Other Finance Listing",
                description="A second test listing.",
                rent_amount=Decimal("600.00"),
                deposit_amount=Decimal("600.00"),
                available_date=timezone.localdate(),
            )
        )
        other_application = RentalApplication.objects.create(
            listing=other_listing,
            applicant=self.lease.application.applicant,
            move_in_date=timezone.localdate(),
            status=ApplicationStatus.APPROVED,
        )
        Lease.objects.create(
            tenant=self.tenant,
            unit=other_unit,
            application=other_application,
            start_date=self.lease.start_date,
            end_date=self.lease.end_date,
            monthly_rent=Decimal("600.00"),
            deposit_amount=Decimal("600.00"),
            payment_due_day=self.lease.payment_due_day,
            status=LeaseStatus.ACTIVE,
            approved_by=other_owner,
            approved_at=timezone.now(),
        )

        payments_response = self.client.get(reverse("finance:payment-list"))
        receipts_response = self.client.get(reverse("finance:receipt-list"))

        self.assertEqual(payments_response.status_code, status.HTTP_200_OK)
        self.assertEqual(receipts_response.status_code, status.HTTP_200_OK)
        self.assertEqual(payments_response.data["count"], 0)
        self.assertEqual(receipts_response.data["count"], 0)

    def test_tenant_financial_access_is_scoped_to_own_records(self):
        charge = self.create_charge()
        deposit = DepositService.create_deposit(
            lease=self.lease,
            created_by=self.owner,
        )
        payment_id = self.create_payment(
            amount=Decimal("800.00"),
            reference_number="PAY-TENANT-001",
        )
        self.allocate_payment(
            payment_id,
            [
                {
                    "rent_charge": str(charge.pk),
                    "amount_allocated": "800.00",
                }
            ],
        )

        other_user = User.objects.create_user(
            email="other-finance-tenant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        other_tenant = Tenant.objects.create(
            user=other_user,
            status=TenantStatus.ACTIVE,
        )
        other_payment = Payment.objects.create(
            tenant=other_tenant,
            amount=Decimal("50.00"),
            payment_date=timezone.localdate(),
            reference_number="PAY-OTHER-001",
            payment_method=PaymentMethod.CASH,
            status=PaymentStatus.COMPLETED,
        )
        Receipt.objects.create(
            payment=other_payment,
            receipt_number="RCP-OTHER-001",
        )

        self.client.force_authenticate(self.tenant.user)
        for route_name in (
            "finance:deposit-list",
            "finance:rent-charge-list",
            "finance:payment-list",
            "finance:receipt-list",
        ):
            response = self.client.get(reverse(route_name))
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(response.data["results"]), 1)

        hidden_payment = self.client.get(
            reverse("finance:payment-detail", kwargs={"pk": other_payment.pk})
        )
        schedule_response = self.client.get(reverse("finance:rent-schedule-list"))
        self.assertEqual(hidden_payment.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(schedule_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(Deposit.objects.filter(pk=deposit.pk).exists())

    def test_accountant_and_assigned_manager_permissions(self):
        charge = self.create_charge()
        manager = User.objects.create_user(
            email="finance-manager@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        unassigned_manager = User.objects.create_user(
            email="finance-unassigned@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        PropertyAssignment.objects.create(
            property_id=self.property.pk,
            manager=manager,
        )
        TeamMembership.objects.create(owner=self.owner, user=manager)
        accountant = User.objects.create_user(
            email="finance-accountant@example.com",
            password="test-password",
            role=UserRole.ACCOUNTANT,
        )

        self.client.force_authenticate(manager)
        manager_response = self.client.get(reverse("finance:rent-charge-list"))
        self.assertEqual(manager_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(manager_response.data["results"]), 1)

        self.client.force_authenticate(unassigned_manager)
        unassigned_response = self.client.get(
            reverse("finance:rent-charge-detail", kwargs={"pk": charge.pk})
        )
        self.assertEqual(unassigned_response.status_code, status.HTTP_404_NOT_FOUND)

        self.client.force_authenticate(accountant)
        accountant_response = self.client.get(reverse("finance:rent-charge-list"))
        self.assertEqual(accountant_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(accountant_response.data["results"]), 1)

        unprofiled_tenant = User.objects.create_user(
            email="finance-unprofiled-tenant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        self.client.force_authenticate(unprofiled_tenant)
        denied_response = self.client.get(reverse("finance:deposit-list"))
        self.assertEqual(denied_response.status_code, status.HTTP_403_FORBIDDEN)

