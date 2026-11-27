from datetime import date, timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.core.management import BaseCommand, CommandError
from django.core.management.utils import get_random_secret_key
from django.test import override_settings
from django.utils import timezone

from apps.accounts.models import User
from apps.accounts.services.property_assignment_service import (
    PropertyAssignmentService,
)
from apps.applications.models import Applicant, RentalApplication
from apps.applications.services.application_service import ApplicationService
from apps.applications.services.screening_service import ScreeningService
from apps.finance.models import (
    Deposit,
    Payment,
    RentCharge,
    RentSchedule,
)
from apps.finance.services.deposit_service import DepositService
from apps.finance.services.invoice_service import InvoiceService
from apps.finance.services.payment_service import PaymentService
from apps.finance.services.rent_charge_service import RentChargeService
from apps.finance.services.rent_schedule_service import RentScheduleService
from apps.leases.models import Lease, Tenant
from apps.leases.services.lease_service import LeaseService
from apps.leases.services.renewal_service import RenewalService
from apps.listings.models import Listing
from apps.listings.services.listing_service import ListingService
from apps.maintenance.models import MaintenanceTicket
from apps.maintenance.services.maintenance_service import MaintenanceService
from apps.properties.models import Property, Unit
from apps.properties.services.property_service import PropertyService
from apps.properties.services.unit_service import UnitService
from common.constants import (
    ApplicationStatus,
    EmploymentStatus,
    LeaseStatus,
    ListingStatus,
    MaintenanceCategory,
    MaintenancePriority,
    MaintenanceStatus,
    PaymentMethod,
    PaymentStatus,
    ScreeningStatus,
    UserRole,
)


class Command(BaseCommand):
    help = (
        "Create idempotent development data for properties, leasing, finance, "
        "maintenance, and dashboard reports."
    )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                "Demo data can only be seeded when DJANGO_DEBUG=True."
            )

        self.generated_credentials: list[tuple[str, str]] = []
        with override_settings(
            EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"
        ):
            with transaction.atomic():
                self.seed_data()

        self.stdout.write(self.style.SUCCESS("Demo data is ready."))
        if self.generated_credentials:
            self.stdout.write(
                "Temporary development credentials (save them now; "
                "passwords are not reset on reruns):"
            )
            for email, password in self.generated_credentials:
                self.stdout.write(f"  {email}: {password}")

    def seed_data(self):
        today = timezone.localdate()
        owner = self.ensure_user(
            "demo.owner@omniproperties.local",
            "Ayaan",
            "Owner",
            UserRole.OWNER,
        )
        manager = self.ensure_user(
            "demo.manager@omniproperties.local",
            "Sahra",
            "Manager",
            UserRole.PROPERTY_MANAGER,
        )
        self.ensure_user(
            "demo.accountant@omniproperties.local",
            "Idris",
            "Accountant",
            UserRole.ACCOUNTANT,
        )

        property_specs = (
            {
                "code": "DEMO-MOG-001",
                "name": "Ocean View Residences",
                "address": "12 Xeebta Road",
                "city": "Mogadishu",
                "country": "Somalia",
                "unit_specs": (
                    ("A-101", 1, 2, "2.00", "1150.00", "2300.00"),
                    ("A-102", 1, 3, "2.50", "1450.00", "2900.00"),
                    ("A-103", 2, 2, "2.00", "1250.00", "2500.00"),
                ),
            },
            {
                "code": "DEMO-HRG-002",
                "name": "Hargeisa Garden Homes",
                "address": "8 Gacan Libaax Street",
                "city": "Hargeisa",
                "country": "Somalia",
                "unit_specs": (
                    ("B-201", 1, 2, "1.50", "900.00", "1800.00"),
                    ("B-202", 2, 1, "1.00", "700.00", "1400.00"),
                ),
            },
        )

        properties: dict[str, Property] = {}
        units: dict[str, Unit] = {}
        for property_spec in property_specs:
            properties[property_spec["code"]] = self.ensure_property(
                owner=owner,
                code=property_spec["code"],
                name=property_spec["name"],
                address=property_spec["address"],
                city=property_spec["city"],
                country=property_spec["country"],
            )
            property_obj = properties[property_spec["code"]]
            PropertyAssignmentService.assign_manager(
                property_obj=property_obj,
                manager_email=manager.email,
                assigned_by=owner,
            )
            for spec in property_spec["unit_specs"]:
                number, floor, bedrooms, bathrooms, rent, deposit = spec
                units[number] = self.ensure_unit(
                    created_by=manager,
                    property_obj=property_obj,
                    unit_number=number,
                    floor=floor,
                    bedrooms=bedrooms,
                    bathrooms=Decimal(bathrooms),
                    rent_amount=Decimal(rent),
                    deposit_amount=Decimal(deposit),
                )

        tenant_specs = (
            {
                "email": "demo.tenant1@omniproperties.local",
                "first_name": "Hodan",
                "last_name": "Ahmed",
                "phone": "+252610000101",
                "employment_status": EmploymentStatus.EMPLOYED,
                "employer_name": "Mogadishu Health Group",
                "monthly_income": Decimal("5200.00"),
                "current_address": "Wadajir, Mogadishu",
                "unit": "A-101",
                "start_date": today - timedelta(days=180),
                "end_date": today + timedelta(days=330),
                "lease_target": "active",
            },
            {
                "email": "demo.tenant2@omniproperties.local",
                "first_name": "Abdi",
                "last_name": "Warsame",
                "phone": "+252610000102",
                "employment_status": EmploymentStatus.SELF_EMPLOYED,
                "employer_name": "Warsame Trading",
                "monthly_income": Decimal("6100.00"),
                "current_address": "New Hargeisa, Hargeisa",
                "unit": "A-102",
                "start_date": today - timedelta(days=320),
                "end_date": today + timedelta(days=45),
                "lease_target": "expiring",
            },
            {
                "email": "demo.tenant3@omniproperties.local",
                "first_name": "Fadumo",
                "last_name": "Ali",
                "phone": "+252610000103",
                "employment_status": EmploymentStatus.EMPLOYED,
                "employer_name": "Somali Tech Services",
                "monthly_income": Decimal("4300.00"),
                "current_address": "Hodan District, Mogadishu",
                "unit": "A-103",
                "start_date": today + timedelta(days=30),
                "end_date": today + timedelta(days=395),
                "lease_target": "future",
            },
        )

        lease_records = []
        for index, tenant_spec in enumerate(tenant_specs, start=1):
            user = self.ensure_user(
                tenant_spec["email"],
                tenant_spec["first_name"],
                tenant_spec["last_name"],
                UserRole.TENANT,
                phone_number=tenant_spec["phone"],
            )
            application_listing = self.ensure_listing(
                created_by=manager,
                unit=units[tenant_spec["unit"]],
                title=f"Demo application listing - {tenant_spec['unit']}",
                target_status=ListingStatus.PUBLISHED,
                today=today,
            )
            application = self.ensure_application(
                listing=application_listing,
                applicant_data={
                    "first_name": tenant_spec["first_name"],
                    "last_name": tenant_spec["last_name"],
                    "email": tenant_spec["email"],
                    "phone": tenant_spec["phone"],
                    "employment_status": tenant_spec["employment_status"],
                    "employer_name": tenant_spec["employer_name"],
                    "monthly_income": tenant_spec["monthly_income"],
                    "current_address": tenant_spec["current_address"],
                },
                reviewed_by=manager,
                target_status=ApplicationStatus.APPROVED,
                today=today,
            )
            lease = self.ensure_lease(
                application=application,
                created_by=manager,
                approved_by=owner,
                start_date=tenant_spec["start_date"],
                end_date=tenant_spec["end_date"],
                monthly_rent=units[tenant_spec["unit"]].rent_amount,
                deposit_amount=units[tenant_spec["unit"]].deposit_amount,
                target=tenant_spec["lease_target"],
            )
            lease_records.append((lease, user, index))

        pending_listing = self.ensure_listing(
            created_by=manager,
            unit=units["B-201"],
            title="Demo pending application - B-201",
            target_status=ListingStatus.PUBLISHED,
            today=today,
        )
        self.ensure_application(
            listing=pending_listing,
            applicant_data={
                "first_name": "Maryan",
                "last_name": "Osman",
                "email": "demo.applicant.pending@omniproperties.local",
                "phone": "+252610000201",
                "employment_status": EmploymentStatus.EMPLOYED,
                "employer_name": "Banaadir Education",
                "monthly_income": Decimal("3100.00"),
                "current_address": "Yaqshid, Mogadishu",
            },
            reviewed_by=manager,
            target_status="pending_screening",
            today=today,
        )

        rejected_listing = self.ensure_listing(
            created_by=manager,
            unit=units["B-202"],
            title="Demo rejected application - B-202",
            target_status=ListingStatus.PUBLISHED,
            today=today,
        )
        self.ensure_application(
            listing=rejected_listing,
            applicant_data={
                "first_name": "Khalid",
                "last_name": "Yusuf",
                "email": "demo.applicant.rejected@omniproperties.local",
                "phone": "+252610000202",
                "employment_status": EmploymentStatus.UNEMPLOYED,
                "employer_name": "",
                "monthly_income": Decimal("0.00"),
                "current_address": "Ibrahim Koodbuur, Hargeisa",
            },
            reviewed_by=manager,
            target_status=ApplicationStatus.REJECTED,
            today=today,
        )
        self.ensure_listing(
            created_by=manager,
            unit=units["B-202"],
            title="Demo rejected application - B-202",
            target_status=ListingStatus.CLOSED,
            today=today,
        )
        self.ensure_listing(
            created_by=manager,
            unit=units["B-202"],
            title="Demo draft listing - B-202",
            target_status=ListingStatus.DRAFT,
            today=today,
        )

        self.seed_finance(
            manager=manager,
            lease_records=lease_records,
            today=today,
        )
        self.seed_maintenance(
            manager=manager,
            lease_records=lease_records,
        )
        RenewalService.generate_renewal_alerts(today=today)

    def ensure_user(
        self,
        email: str,
        first_name: str,
        last_name: str,
        role: str,
        **extra_fields,
    ) -> User:
        user = User.objects.filter(email=email).first()
        if user is None:
            password = get_random_secret_key()
            user = User.objects.create_user(
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                role=role,
                **extra_fields,
            )
            self.generated_credentials.append((email, password))
            return user

        user.first_name = first_name
        user.last_name = last_name
        user.role = role
        user.is_active = True
        for field, value in extra_fields.items():
            setattr(user, field, value)
        user.save()
        return user

    @staticmethod
    def ensure_property(
        *,
        owner: User,
        code: str,
        name: str,
        address: str,
        city: str,
        country: str,
    ) -> Property:
        property_obj = Property.objects.filter(code=code).first()
        if property_obj is None:
            return PropertyService.create_property(
                owner=owner,
                code=code,
                name=name,
                address=address,
                city=city,
                country=country,
                description="Development sample property.",
            )
        property_obj.owner = owner
        property_obj.name = name
        property_obj.address = address
        property_obj.city = city
        property_obj.country = country
        property_obj.full_clean()
        property_obj.save()
        return property_obj

    @staticmethod
    def ensure_unit(
        *,
        created_by: User,
        property_obj: Property,
        unit_number: str,
        floor: int,
        bedrooms: int,
        bathrooms: Decimal,
        rent_amount: Decimal,
        deposit_amount: Decimal,
    ) -> Unit:
        unit = Unit.objects.filter(
            property=property_obj,
            unit_number=unit_number,
        ).first()
        if unit is None:
            return UnitService.create_unit(
                created_by=created_by,
                property=property_obj,
                unit_number=unit_number,
                floor=floor,
                bedrooms=bedrooms,
                bathrooms=bathrooms,
                square_meters=Decimal("85.00") + (bedrooms * Decimal("18.00")),
                rent_amount=rent_amount,
                deposit_amount=deposit_amount,
                description="Furnished development sample unit.",
            )
        unit.floor = floor
        unit.bedrooms = bedrooms
        unit.bathrooms = bathrooms
        unit.square_meters = Decimal("85.00") + (bedrooms * Decimal("18.00"))
        unit.rent_amount = rent_amount
        unit.deposit_amount = deposit_amount
        unit.description = "Furnished development sample unit."
        unit.full_clean()
        unit.save()
        return unit

    @staticmethod
    def ensure_listing(
        *,
        created_by: User,
        unit: Unit,
        title: str,
        target_status: str,
        today: date,
    ) -> Listing:
        listing = Listing.objects.filter(unit=unit, title=title).first()
        if listing is None:
            listing = ListingService.create_listing(
                created_by=created_by,
                unit=unit,
                title=title,
                description="Development sample rental listing.",
                rent_amount=unit.rent_amount,
                deposit_amount=unit.deposit_amount,
                available_date=today,
            )

        if target_status in (ListingStatus.PUBLISHED, ListingStatus.CLOSED):
            if listing.status == ListingStatus.DRAFT:
                listing = ListingService.publish_listing(
                    listing,
                    published_by=created_by,
                )
        if target_status == ListingStatus.CLOSED:
            if listing.status == ListingStatus.PUBLISHED:
                listing = ListingService.close_listing(
                    listing,
                    closed_by=created_by,
                )
        closed_for_active_lease = (
            target_status == ListingStatus.PUBLISHED
            and listing.status == ListingStatus.CLOSED
            and (
                listing.applications.filter(
                    status=ApplicationStatus.REJECTED,
                ).exists()
                or listing.applications.filter(
                    status=ApplicationStatus.APPROVED,
                    leases__status__in=(
                        LeaseStatus.ACTIVE,
                        LeaseStatus.EXPIRING,
                    ),
                ).exists()
            )
        )
        if listing.status != target_status and not closed_for_active_lease:
            raise CommandError(
                f"Demo listing '{title}' is {listing.status}, "
                f"expected {target_status}."
            )
        return listing

    @staticmethod
    def ensure_application(
        *,
        listing: Listing,
        applicant_data: dict,
        reviewed_by: User,
        target_status: str,
        today: date,
    ) -> RentalApplication:
        applicant = Applicant.objects.filter(
            email__iexact=applicant_data["email"],
        ).first()
        application = None
        if applicant is not None:
            application = RentalApplication.objects.filter(
                listing=listing,
                applicant=applicant,
            ).first()

        if application is None:
            application = ApplicationService.create_application(
                listing=listing,
                applicant_data=applicant_data,
                move_in_date=today,
                notes="Created by the development demo data command.",
            )

        if application.status == ApplicationStatus.SUBMITTED:
            application = ApplicationService.submit_for_review(application)
        if application.status == ApplicationStatus.UNDER_REVIEW:
            application = ApplicationService.start_screening(application)

        if target_status == "pending_screening":
            if application.status != ApplicationStatus.SCREENING:
                raise CommandError("Pending demo application left screening.")
            if application.screening.status != ScreeningStatus.PENDING:
                raise CommandError("Pending demo application has a completed screening.")
            return application

        if target_status == ApplicationStatus.APPROVED:
            if application.status == ApplicationStatus.SCREENING:
                current_screening = application.screening
                if current_screening.status == ScreeningStatus.PENDING:
                    current_screening = ScreeningService.start_screening(
                        current_screening,
                        reviewed_by=reviewed_by,
                    )
                if current_screening.status == ScreeningStatus.IN_PROGRESS:
                    ScreeningService.pass_screening(
                        current_screening,
                        reviewed_by=reviewed_by,
                        result_data={
                            "score": 92,
                            "notes": "Demo screening passed.",
                            "income_verified": True,
                            "employment_verified": True,
                            "references_checked": True,
                        },
                    )
                application = ApplicationService.approve_application(
                    application,
                    approved_by=reviewed_by,
                )
            elif application.status != ApplicationStatus.APPROVED:
                raise CommandError(
                    f"Cannot move demo application from {application.status} "
                    "to approved."
                )
            return application

        if target_status == ApplicationStatus.REJECTED:
            if application.status == ApplicationStatus.SCREENING:
                current_screening = application.screening
                if current_screening.status == ScreeningStatus.PENDING:
                    current_screening = ScreeningService.start_screening(
                        current_screening,
                        reviewed_by=reviewed_by,
                    )
                if current_screening.status == ScreeningStatus.IN_PROGRESS:
                    ScreeningService.fail_screening(
                        current_screening,
                        reviewed_by=reviewed_by,
                        result_data={
                            "score": 28,
                            "notes": "Demo screening did not meet requirements.",
                            "income_verified": False,
                            "employment_verified": False,
                            "references_checked": True,
                        },
                    )
                application = ApplicationService.reject_application(
                    application,
                    rejection_reason="Income verification did not meet requirements.",
                    rejected_by=reviewed_by,
                )
            elif application.status != ApplicationStatus.REJECTED:
                raise CommandError(
                    f"Cannot move demo application from {application.status} "
                    "to rejected."
                )
            return application

        raise CommandError(f"Unknown demo application state: {target_status}.")

    @staticmethod
    def ensure_lease(
        *,
        application: RentalApplication,
        created_by: User,
        approved_by: User,
        start_date: date,
        end_date: date,
        monthly_rent: Decimal,
        deposit_amount: Decimal,
        target: str,
    ) -> Lease:
        lease = Lease.objects.filter(application=application).first()
        if lease is None:
            lease = LeaseService.create_lease(
                created_by=created_by,
                application=application,
                start_date=start_date,
                end_date=end_date,
                monthly_rent=monthly_rent,
                deposit_amount=deposit_amount,
                payment_due_day=5,
                notes="Created by the development demo data command.",
            )

        if lease.status == LeaseStatus.DRAFT:
            lease = LeaseService.submit_for_approval(lease, changed_by=created_by)
        if lease.status == LeaseStatus.PENDING_APPROVAL:
            lease = LeaseService.approve_lease(lease, approved_by=approved_by)
        if target in {"active", "expiring"} and lease.status == LeaseStatus.APPROVED:
            lease = LeaseService.activate_lease(lease, changed_by=created_by)
        if target not in {"active", "expiring", "future"}:
            raise CommandError(f"Unknown demo lease state: {target}.")

        valid_statuses = {
            "active": {LeaseStatus.ACTIVE, LeaseStatus.EXPIRING},
            "expiring": {LeaseStatus.ACTIVE, LeaseStatus.EXPIRING},
            "future": {LeaseStatus.APPROVED},
        }
        if lease.status not in valid_statuses[target]:
            raise CommandError(
                f"Demo lease for application {application.pk} has status "
                f"{lease.status}, expected {target}."
            )
        return lease

    @staticmethod
    def shifted_month(today: date, offset: int) -> tuple[int, int]:
        month_index = today.year * 12 + today.month - 1 + offset
        return month_index // 12, month_index % 12 + 1

    def seed_finance(self, *, manager: User, lease_records, today: date):
        charge_records: dict[int, list[RentCharge]] = {}
        for lease, _user, index in lease_records:
            if lease.status not in (LeaseStatus.ACTIVE, LeaseStatus.EXPIRING):
                continue
            schedule = RentSchedule.objects.filter(lease=lease).first()
            if schedule is None:
                schedule = RentScheduleService.create_schedule(
                    lease=lease,
                    created_by=manager,
                )

            charges = []
            for month_offset in (-1, 0):
                year, month = self.shifted_month(today, month_offset)
                charge = RentChargeService.generate_monthly_charge(
                    schedule,
                    billing_month=month,
                    billing_year=year,
                    created_by=manager,
                    today=today,
                )
                InvoiceService.issue_invoice(
                    rent_charge=charge,
                    issued_date=date(year, month, 1),
                )
                charges.append(charge)
            charge_records[index] = charges

        first_charge = charge_records[1][0]
        second_charge = charge_records[2][0]
        self.ensure_payment(
            manager=manager,
            tenant=lease_records[0][0].tenant,
            charge=first_charge,
            amount=min(Decimal("400.00"), first_charge.amount),
            reference="DEMO-PAYMENT-001",
            notes="Partial development rent payment.",
        )
        self.ensure_payment(
            manager=manager,
            tenant=lease_records[1][0].tenant,
            charge=second_charge,
            amount=second_charge.amount,
            reference="DEMO-PAYMENT-002",
            notes="Full development rent payment.",
        )

        for lease, _user, index in lease_records:
            deposit = Deposit.objects.filter(lease=lease).first()
            if deposit is None:
                deposit = DepositService.create_deposit(
                    lease=lease,
                    created_by=manager,
                )
            if index == 1:
                target_paid = deposit.required_amount
            elif index == 2:
                target_paid = (deposit.required_amount / 2).quantize(
                    Decimal("0.01")
                )
            else:
                target_paid = Decimal("0.00")

            remaining_target = target_paid - deposit.paid_amount
            if remaining_target > 0:
                DepositService.record_deposit_payment(
                    deposit,
                    amount=remaining_target,
                    reference_number=f"DEMO-DEPOSIT-{index:03d}",
                    payment_date=today,
                    payment_method=PaymentMethod.MOBILE_MONEY,
                    recorded_by=manager,
                )

    @staticmethod
    def ensure_payment(
        *,
        manager: User,
        tenant: Tenant,
        charge: RentCharge,
        amount: Decimal,
        reference: str,
        notes: str,
    ) -> Payment:
        payment = Payment.objects.filter(reference_number=reference).first()
        if payment is None:
            payment = PaymentService.create_payment(
                created_by=manager,
                tenant=tenant,
                amount=amount,
                payment_date=timezone.localdate(),
                reference_number=reference,
                payment_method=PaymentMethod.MOBILE_MONEY,
                notes=notes,
            )
        if payment.tenant_id != tenant.pk or payment.amount != amount:
            raise CommandError(
                f"Demo payment {reference} does not match the sample data."
            )
        if payment.status == PaymentStatus.PENDING:
            PaymentService.allocate_payment(
                payment,
                allocations=[
                    {
                        "rent_charge": charge,
                        "amount_allocated": amount,
                    }
                ],
                allocated_by=manager,
            )
        if payment.status not in (PaymentStatus.COMPLETED, PaymentStatus.PENDING):
            raise CommandError(
                f"Demo payment {reference} has unexpected status {payment.status}."
            )
        return payment

    @staticmethod
    def seed_maintenance(*, manager: User, lease_records):
        active_lease, _user, _index = lease_records[0]
        ticket_specs = (
            (
                "Demo maintenance - open",
                MaintenanceStatus.OPEN,
                "A dripping kitchen tap needs inspection.",
                MaintenanceCategory.PLUMBING,
                MaintenancePriority.LOW,
            ),
            (
                "Demo maintenance - in progress",
                MaintenanceStatus.IN_PROGRESS,
                "The living room light circuit needs repair.",
                MaintenanceCategory.ELECTRICAL,
                MaintenancePriority.MEDIUM,
            ),
            (
                "Demo maintenance - resolved",
                MaintenanceStatus.RESOLVED,
                "The bathroom ventilation fan was not working.",
                MaintenanceCategory.HVAC,
                MaintenancePriority.HIGH,
            ),
        )
        for title, target_status, description, category, priority in ticket_specs:
            ticket = MaintenanceTicket.objects.filter(
                tenant=active_lease.tenant,
                unit=active_lease.unit,
                title=title,
            ).first()
            if ticket is None:
                ticket = MaintenanceService.create_ticket(
                    created_by=manager,
                    unit=active_lease.unit,
                    tenant=active_lease.tenant,
                    title=title,
                    description=description,
                    category=category,
                    priority=priority,
                )

            if target_status == MaintenanceStatus.IN_PROGRESS:
                if ticket.status == MaintenanceStatus.OPEN:
                    ticket = MaintenanceService.assign_ticket(
                        ticket,
                        assigned_to=manager,
                        assigned_by=manager,
                    )
                if ticket.status == MaintenanceStatus.ASSIGNED:
                    ticket = MaintenanceService.start_work(
                        ticket,
                        started_by=manager,
                    )
            elif target_status == MaintenanceStatus.RESOLVED:
                if ticket.status == MaintenanceStatus.OPEN:
                    ticket = MaintenanceService.assign_ticket(
                        ticket,
                        assigned_to=manager,
                        assigned_by=manager,
                    )
                if ticket.status == MaintenanceStatus.ASSIGNED:
                    ticket = MaintenanceService.start_work(
                        ticket,
                        started_by=manager,
                    )
                if ticket.status == MaintenanceStatus.IN_PROGRESS:
                    MaintenanceService.resolve_ticket(
                        ticket,
                        resolved_by=manager,
                        resolution_notes="Replaced the fan motor and verified airflow.",
                    )

            current_status = MaintenanceTicket.objects.get(pk=ticket.pk).status
            if current_status != target_status:
                raise CommandError(
                    f"Demo ticket '{title}' is {current_status}, "
                    f"expected {target_status}."
                )
