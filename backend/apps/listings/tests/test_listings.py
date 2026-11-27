from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.properties.models import Property, Unit
from common.constants import (
    AuditAction,
    ListingStatus,
    PropertyStatus,
    UnitStatus,
    UserRole,
)
from common.exceptions import ConflictErrorResponse

from ..services.listing_service import ListingService


class ListingApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="listing-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        self.client.force_authenticate(self.owner)
        self.property = Property.objects.create(
            owner=self.owner,
            name="Riverside Apartments",
            code="RIVER-01",
            address="10 River Road",
            city="Mogadishu",
            country="Somalia",
            status=PropertyStatus.ACTIVE,
        )
        self.unit = Unit.objects.create(
            property=self.property,
            unit_number="B-101",
            floor=1,
            bedrooms=2,
            bathrooms=Decimal("1.50"),
            square_meters=Decimal("78.00"),
            rent_amount=Decimal("700.00"),
            deposit_amount=Decimal("700.00"),
            status=UnitStatus.AVAILABLE,
        )

    def listing_payload(self, **overrides):
        payload = {
            "unit": str(self.unit.pk),
            "title": "Bright two-bedroom apartment",
            "description": "Close to local services.",
            "rent_amount": "725.00",
            "deposit_amount": "725.00",
            "available_date": "2026-12-01",
        }
        payload.update(overrides)
        return payload

    def create_listing(self, **overrides):
        return ListingService.create_listing(
            created_by=self.owner,
            unit=self.unit,
            title=overrides.get("title", "Test listing"),
            description="Test listing description",
            rent_amount=Decimal("725.00"),
            deposit_amount=Decimal("725.00"),
            available_date="2026-12-01",
        )

    def test_listing_creation(self):
        response = self.client.post(
            reverse("listings:listing-list"),
            self.listing_payload(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], ListingStatus.DRAFT)
        self.assertEqual(response.data["unit"], self.unit.pk)

    def test_unavailable_unit_cannot_be_listed(self):
        self.unit.status = UnitStatus.OCCUPIED
        self.unit.save(update_fields=["status", "updated_at"])

        with self.assertRaises(ConflictErrorResponse):
            self.create_listing()

    def test_archived_property_cannot_have_a_new_listing(self):
        self.property.status = PropertyStatus.ARCHIVED
        self.property.save(update_fields=["status", "updated_at"])

        with self.assertRaises(ConflictErrorResponse):
            self.create_listing()

    def test_publish_listing_updates_unit_status(self):
        listing = self.create_listing()

        response = self.client.post(
            reverse("listings:listing-publish", kwargs={"pk": listing.pk}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        listing.refresh_from_db()
        self.unit.refresh_from_db()
        self.assertEqual(listing.status, ListingStatus.PUBLISHED)
        self.assertIsNotNone(listing.published_at)
        self.assertEqual(self.unit.status, UnitStatus.LISTED)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.LISTING_PUBLISHED,
                model_name="Listing",
                object_id=str(listing.pk),
                user=self.owner,
            ).exists()
        )

    def test_pause_listing_keeps_unit_listed(self):
        listing = self.create_listing()
        ListingService.publish_listing(listing)

        response = self.client.post(
            reverse("listings:listing-pause", kwargs={"pk": listing.pk}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        listing.refresh_from_db()
        self.unit.refresh_from_db()
        self.assertEqual(listing.status, ListingStatus.PAUSED)
        self.assertEqual(self.unit.status, UnitStatus.LISTED)

    def test_close_listing_returns_unit_to_available(self):
        listing = self.create_listing()
        ListingService.publish_listing(listing)

        response = self.client.post(
            reverse("listings:listing-close", kwargs={"pk": listing.pk}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        listing.refresh_from_db()
        self.unit.refresh_from_db()
        self.assertEqual(listing.status, ListingStatus.CLOSED)
        self.assertEqual(self.unit.status, UnitStatus.AVAILABLE)
        self.assertTrue(
            AuditLog.objects.filter(
                action=AuditAction.LISTING_CLOSED,
                model_name="Listing",
                object_id=str(listing.pk),
                user=self.owner,
            ).exists()
        )

    def test_unit_cannot_have_multiple_active_listings(self):
        first_listing = self.create_listing(title="First")
        second_listing = self.create_listing(title="Second")
        ListingService.publish_listing(first_listing)

        response = self.client.post(
            reverse("listings:listing-publish", kwargs={"pk": second_listing.pk}),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        first_listing.refresh_from_db()
        second_listing.refresh_from_db()
        self.assertEqual(first_listing.status, ListingStatus.PUBLISHED)
        self.assertEqual(second_listing.status, ListingStatus.DRAFT)

    def test_public_endpoint_returns_only_published_listings(self):
        draft = self.create_listing(title="Draft listing")
        published = self.create_listing(title="Published listing")
        ListingService.publish_listing(published)
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("listings:listing-public"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual([item["id"] for item in results], [str(published.pk)])
        self.assertNotIn(str(draft.pk), [item["id"] for item in results])
        self.assertEqual(
            set(results[0]),
            {
                "id",
                "title",
                "description",
                "rent_amount",
                "deposit_amount",
                "available_date",
                "status",
                "unit",
            },
        )

    def test_public_detail_returns_only_marketplace_fields(self):
        listing = self.create_listing(title="Public listing")
        ListingService.publish_listing(listing)
        self.client.force_authenticate(user=None)

        response = self.client.get(
            reverse(
                "listings:listing-public-detail",
                kwargs={"listing_id": listing.pk},
            )
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data),
            {
                "id",
                "title",
                "description",
                "rent_amount",
                "deposit_amount",
                "available_date",
                "status",
                "unit",
            },
        )
        self.assertEqual(
            set(response.data["unit"]),
            {
                "unit_number",
                "floor",
                "bedrooms",
                "bathrooms",
                "square_meters",
                "property",
            },
        )
        self.assertEqual(
            set(response.data["unit"]["property"]),
            {"name", "address", "city", "country"},
        )
        self.assertEqual(response.data["status"], ListingStatus.PUBLISHED)

    def test_public_detail_hides_unpublished_or_inactive_property_listings(self):
        draft = self.create_listing(title="Draft listing")
        self.client.force_authenticate(user=None)
        draft_response = self.client.get(
            reverse(
                "listings:listing-public-detail",
                kwargs={"listing_id": draft.pk},
            )
        )
        self.assertEqual(draft_response.status_code, status.HTTP_404_NOT_FOUND)

        ListingService.publish_listing(draft)
        self.property.status = PropertyStatus.INACTIVE
        self.property.save(update_fields=["status", "updated_at"])
        inactive_property_response = self.client.get(
            reverse(
                "listings:listing-public-detail",
                kwargs={"listing_id": draft.pk},
            )
        )
        self.assertEqual(
            inactive_property_response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
