from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User
from common.constants import AuditAction, UserRole

from ..models import AuditLog
from ..selectors.audit_selector import AuditSelector
from ..services.audit_log_service import AuditContext, AuditLogService


class AuditLogApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="audit-owner@example.com",
            password="test-password",
            role=UserRole.OWNER,
        )
        self.manager = User.objects.create_user(
            email="audit-manager@example.com",
            password="test-password",
            role=UserRole.PROPERTY_MANAGER,
        )
        self.accountant = User.objects.create_user(
            email="audit-accountant@example.com",
            password="test-password",
            role=UserRole.ACCOUNTANT,
        )
        self.tenant = User.objects.create_user(
            email="audit-tenant@example.com",
            password="test-password",
            role=UserRole.TENANT,
        )
        self.audit_log = AuditLogService.log_action(
            user=self.owner,
            action=AuditAction.PROPERTY_ARCHIVED,
            model_name="Property",
            object_id="property-uuid",
            old_data={"status": "ACTIVE"},
            new_data={"status": "ARCHIVED"},
            context=AuditContext(
                ip_address="127.0.0.1",
                user_agent="Audit test client",
            ),
        )

    def test_audit_creation_preserves_actor_change_and_request_context(self):
        self.assertEqual(self.audit_log.user, self.owner)
        self.assertEqual(self.audit_log.old_data, {"status": "ACTIVE"})
        self.assertEqual(self.audit_log.new_data, {"status": "ARCHIVED"})
        self.assertEqual(self.audit_log.ip_address, "127.0.0.1")
        self.assertEqual(self.audit_log.user_agent, "Audit test client")
        self.assertEqual(
            AuditSelector.get_activity_history(
                model_name="Property",
                object_id="property-uuid",
            ).count(),
            1,
        )

    def test_audit_logs_are_visible_only_to_allowed_roles(self):
        for user in (self.owner, self.manager, self.accountant):
            self.client.force_authenticate(user)
            response = self.client.get(reverse("audit:audit-log-list"))
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["count"], 1)

        self.client.force_authenticate(self.tenant)
        response = self.client.get(reverse("audit:audit-log-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_filters_support_action_model_user_date_and_search(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(
            reverse("audit:audit-log-list"),
            {
                "action": AuditAction.PROPERTY_ARCHIVED,
                "model_name": "Property",
                "user": str(self.owner.pk),
                "date": timezone.localdate().isoformat(),
                "search": "property-uuid",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_audit_api_is_read_only(self):
        self.client.force_authenticate(self.owner)

        create_response = self.client.post(
            reverse("audit:audit-log-list"),
            {"action": AuditAction.PAYMENT_CREATED},
            format="json",
        )
        update_response = self.client.patch(
            reverse(
                "audit:audit-log-detail",
                kwargs={"pk": self.audit_log.pk},
            ),
            {"action": AuditAction.PAYMENT_CREATED},
            format="json",
        )
        delete_response = self.client.delete(
            reverse(
                "audit:audit-log-detail",
                kwargs={"pk": self.audit_log.pk},
            )
        )

        self.assertEqual(create_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(update_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertEqual(delete_response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_audit_logs_cannot_be_updated_or_deleted_through_orm(self):
        fetched_log = AuditLog.objects.get(pk=self.audit_log.pk)
        fetched_log.action = AuditAction.PAYMENT_CREATED
        with self.assertRaises(ValidationError):
            fetched_log.save()
        with self.assertRaises(ValidationError):
            fetched_log.delete()
        with self.assertRaises(ValidationError):
            AuditLog.objects.filter(pk=self.audit_log.pk).update(
                action=AuditAction.PAYMENT_CREATED
            )
        with self.assertRaises(ValidationError):
            AuditLog.objects.filter(pk=self.audit_log.pk).delete()
