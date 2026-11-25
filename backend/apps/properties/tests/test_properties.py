from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import AuditLog
from apps.accounts.models import User
from common.constants import AuditAction, PropertyStatus, UnitStatus, UserRole

from ..models import Property, Unit
from ..services.property_service import PropertyService
from ..services.unit_service import UnitService


class PropertyApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        self.client.force_authenticate(self.owner)
        self.property = PropertyService.create_property(
            owner=self.owner,
            name="Harbor House",
            code="HARBOR-01",
            address="1 Harbor Road",
            city="Mogadishu",
            country="Somalia",
        )

    def property_payload(self, **overrides):
        payload = {
            "name": "Garden Court",
            "code": "GARDEN-01",
            "description": "Residential property",
            "address": "2 Garden Road",
            "city": "Mogadishu",
            "country": "Somalia",
        }
        payload.update(overrides)
        return payload

    def unit_payload(self, **overrides):
        payload = {
            "property": str(self.property.pk),
            "unit_number": "A-101",
            "floor": 1,
            "bedrooms": 2,
            "bathrooms": "1.50",
            "square_meters": "72.50",
            "rent_amount": "650.00",
            "deposit_amount": "650.00",
            "description": "Two-bedroom unit",
        }
        payload.update(overrides)
        return payload

    def test_property_creation(self):
        response = self.client.post(
            reverse("properties:property-list"),
            self.property_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_property = Property.objects.get(code="GARDEN-01")
        self.assertEqual(created_property.owner, self.owner)
        self.assertEqual(created_property.status, PropertyStatus.ACTIVE)

    def test_unit_creation(self):
        response = self.client.post(
            reverse("properties:unit-list"),
            self.unit_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        unit = Unit.objects.get(property=self.property, unit_number="A-101")
        self.assertEqual(unit.rent_amount, Decimal("650.00"))

    def test_unit_number_must_be_unique_within_property(self):
        UnitService.create_unit(
            created_by=self.owner,
            property=self.property,
            unit_number="A-101",
            floor=1,
            bedrooms=2,
            bathrooms=Decimal("1.50"),
            square_meters=Decimal("72.50"),
            rent_amount=Decimal("650.00"),
            deposit_amount=Decimal("650.00"),
        )

        response = self.client.post(
            reverse("properties:unit-list"),
            self.unit_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_unit_cannot_be_reassigned_to_unmanaged_property(self):
        other_owner = User.objects.create_user(
            email="other-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        other_property = PropertyService.create_property(
            owner=other_owner,
            name="Other Property",
            code="OTHER-01",
            address="3 Other Road",
            city="Mogadishu",
            country="Somalia",
        )
        unit = UnitService.create_unit(
            created_by=self.owner,
            property=self.property,
            unit_number="A-101",
            floor=1,
            bedrooms=2,
            bathrooms=Decimal("1.50"),
            square_meters=Decimal("72.50"),
            rent_amount=Decimal("650.00"),
            deposit_amount=Decimal("650.00"),
        )

        response = self.client.patch(
            reverse("properties:unit-detail", kwargs={"pk": unit.pk}),
            {"property": str(other_property.pk)},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        unit.refresh_from_db()
        self.assertEqual(unit.property_id, self.property.pk)

    def test_property_archive_transitions_active_property(self):
        response = self.client.post(
            reverse("properties:property-archive", kwargs={"pk": self.property.pk}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.property.refresh_from_db()
        self.assertEqual(self.property.status, PropertyStatus.ARCHIVED)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.PROPERTY_ARCHIVED,
                model_name="Property",
                object_id=str(self.property.pk),
                user=self.owner,
            ).exists()
        )

    def test_unit_availability_returns_requested_status_counts(self):
        statuses = (
            UnitStatus.AVAILABLE,
            UnitStatus.LISTED,
            UnitStatus.OCCUPIED,
            UnitStatus.RESERVED,
            UnitStatus.MAINTENANCE,
        )
        for index, unit_status in enumerate(statuses):
            Unit.objects.create(
                property=self.property,
                unit_number=f"A-{index + 101}",
                floor=1,
                bedrooms=1,
                bathrooms=Decimal("1.00"),
                square_meters=Decimal("50.00"),
                rent_amount=Decimal("500.00"),
                deposit_amount=Decimal("0.00"),
                status=unit_status,
            )

        response = self.client.get(reverse("properties:unit-availability"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "available": 1,
                "listed": 1,
                "occupied": 1,
                "reserved": 1,
                "maintenance": 1,
            },
        )
