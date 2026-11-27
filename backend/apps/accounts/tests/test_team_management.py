from datetime import timedelta
from urllib.parse import parse_qs, urlsplit

from django.core import mail
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import (
    PropertyAssignment,
    TeamInvitation,
    TeamMembership,
    User,
)
from apps.accounts.services.property_assignment_service import (
    PropertyAssignmentService,
)
from apps.properties.models import Property
from apps.properties.services.property_service import PropertyService
from common.constants import TeamInvitationStatus, UserRole


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_BASE_URL="http://localhost:5173",
)
class TeamManagementApiTests(APITestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="team-owner@example.com",
            password="Owner-Pass-2026",
            role=UserRole.OWNER,
        )
        self.client.force_authenticate(self.owner)

    def invite(
        self,
        *,
        email="staff@example.com",
        role=UserRole.PROPERTY_MANAGER,
        first_name="",
        last_name="",
    ):
        return self.client.post(
            reverse("team:team-invitation-list"),
            {
                "email": email,
                "role": role,
                "first_name": first_name,
                "last_name": last_name,
            },
            format="json",
        )

    def create_property(self, *, owner, code):
        return PropertyService.create_property(
            owner=owner,
            name=f"Property {code}",
            code=code,
            address="1 Test Road",
            city="Mogadishu",
            country="Somalia",
        )

    @staticmethod
    def invitation_token(message):
        setup_url = next(
            line
            for line in message.body.splitlines()
            if "/team/accept-invitation/?" in line
        )
        query = parse_qs(urlsplit(setup_url).query)
        return query["invitation"][0], query["token"][0]

    def test_owner_can_invite_property_manager_and_accountant(self):
        for role, email in (
            (UserRole.PROPERTY_MANAGER, "manager@example.com"),
            (UserRole.ACCOUNTANT, "accountant@example.com"),
        ):
            with self.subTest(role=role):
                response = self.invite(email=email, role=role)

                self.assertEqual(
                    response.status_code,
                    status.HTTP_201_CREATED,
                    response.data,
                )
                user = User.objects.get(email=email)
                self.assertEqual(user.role, role)
                self.assertTrue(user.is_active)
                self.assertFalse(user.has_usable_password())
                self.assertTrue(
                    TeamMembership.objects.filter(
                        owner=self.owner,
                        user=user,
                        is_active=True,
                    ).exists()
                )
                invitation = TeamInvitation.objects.get(pk=response.data["id"])
                self.assertEqual(invitation.status, TeamInvitationStatus.PENDING)
                self.assertNotIn(
                    self.invitation_token(mail.outbox[-1])[1],
                    invitation.token_hash,
                )
        self.assertEqual(len(mail.outbox), 2)

    def test_invitation_rejects_owner_and_tenant_roles(self):
        for role in (UserRole.OWNER, UserRole.TENANT):
            with self.subTest(role=role):
                response = self.invite(
                    email=f"{role.lower()}@example.com",
                    role=role,
                )
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertFalse(
                    User.objects.filter(email=f"{role.lower()}@example.com").exists()
                )

    def test_existing_active_staff_account_is_reused_without_email_or_password_change(
        self,
    ):
        existing = User.objects.create_user(
            email="existing-manager@example.com",
            password="Existing-Password-2026",
            role=UserRole.PROPERTY_MANAGER,
        )
        password_hash = existing.password

        response = self.invite(
            email=existing.email,
            role=UserRole.PROPERTY_MANAGER,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        existing.refresh_from_db()
        self.assertEqual(existing.password, password_hash)
        self.assertEqual(len(mail.outbox), 0)
        self.assertTrue(
            TeamMembership.objects.filter(
                owner=self.owner,
                user=existing,
                is_active=True,
            ).exists()
        )
        invitation = TeamInvitation.objects.get(pk=response.data["id"])
        self.assertEqual(invitation.status, TeamInvitationStatus.ACCEPTED)
        self.assertIsNotNone(invitation.accepted_at)

    def test_existing_owner_or_tenant_account_is_rejected(self):
        for role in (UserRole.OWNER, UserRole.TENANT):
            email = f"existing-{role.lower()}@example.com"
            User.objects.create_user(
                email=email,
                password="Existing-Password-2026",
                role=role,
            )
            response = self.invite(email=email, role=UserRole.PROPERTY_MANAGER)
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertFalse(TeamMembership.objects.filter(owner=self.owner).exists())
        self.assertEqual(len(mail.outbox), 0)

    def test_non_owner_cannot_view_or_invite_team_members(self):
        for role in (
            UserRole.PROPERTY_MANAGER,
            UserRole.ACCOUNTANT,
            UserRole.TENANT,
        ):
            with self.subTest(role=role):
                user = User.objects.create_user(
                    email=f"{role.lower()}-viewer@example.com",
                    password="Staff-Pass-2026",
                    role=role,
                )
                self.client.force_authenticate(user)
                list_response = self.client.get(reverse("team:team-member-list"))
                invite_response = self.invite(
                    email=f"{role.lower()}-invite@example.com"
                )
                self.assertEqual(
                    list_response.status_code,
                    status.HTTP_403_FORBIDDEN,
                )
                self.assertEqual(
                    invite_response.status_code,
                    status.HTTP_403_FORBIDDEN,
                )
        self.client.force_authenticate(self.owner)
        self.assertEqual(len(mail.outbox), 0)

    def test_invitation_acceptance_sets_password_and_marks_accepted(self):
        create_response = self.invite()
        invitation_id, token = self.invitation_token(mail.outbox[0])
        self.client.force_authenticate(user=None)

        response = self.client.post(
            reverse("team:team-invitation-accept"),
            {
                "invitation": invitation_id,
                "token": token,
                "new_password": "Distinct-Team-Password-9031",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        invitation = TeamInvitation.objects.get(pk=create_response.data["id"])
        invitation.user.refresh_from_db()
        self.assertEqual(invitation.status, TeamInvitationStatus.ACCEPTED)
        self.assertIsNotNone(invitation.accepted_at)
        self.assertIsNone(invitation.token_hash)
        self.assertTrue(
            invitation.user.check_password("Distinct-Team-Password-9031")
        )

    def test_resend_rotates_token_and_refreshes_expiry(self):
        create_response = self.invite()
        invitation = TeamInvitation.objects.get(pk=create_response.data["id"])
        previous_expiry = invitation.expires_at
        previous_hash = invitation.token_hash

        response = self.client.post(
            reverse(
                "team:team-invitation-resend",
                kwargs={"pk": invitation.pk},
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, TeamInvitationStatus.PENDING)
        self.assertGreater(invitation.expires_at, previous_expiry)
        self.assertNotEqual(invitation.token_hash, previous_hash)
        self.assertEqual(len(mail.outbox), 2)

    def test_expired_invitation_can_be_resent(self):
        create_response = self.invite()
        invitation = TeamInvitation.objects.get(pk=create_response.data["id"])
        invitation.expires_at = timezone.now() - timedelta(seconds=1)
        invitation.save(update_fields=["expires_at", "updated_at"])

        response = self.client.post(
            reverse(
                "team:team-invitation-resend",
                kwargs={"pk": invitation.pk},
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, TeamInvitationStatus.PENDING)
        self.assertGreater(invitation.expires_at, timezone.now())

    def test_expired_invitation_is_reported_in_team_status_filter(self):
        create_response = self.invite()
        invitation = TeamInvitation.objects.get(pk=create_response.data["id"])
        invitation.expires_at = timezone.now() - timedelta(seconds=1)
        invitation.save(update_fields=["expires_at", "updated_at"])

        response = self.client.get(
            reverse("team:team-member-list"),
            {"status": "expired"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["status"], "EXPIRED")
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, TeamInvitationStatus.EXPIRED)

    def test_revoke_invitation_deactivates_only_owner_membership(self):
        create_response = self.invite()
        invitation = TeamInvitation.objects.get(pk=create_response.data["id"])
        second_owner = User.objects.create_user(
            email="second-owner@example.com",
            password="Owner-Pass-2026",
            role=UserRole.OWNER,
        )
        other_membership = TeamMembership.objects.create(
            owner=second_owner,
            user=invitation.user,
        )

        response = self.client.post(
            reverse(
                "team:team-invitation-revoke",
                kwargs={"pk": invitation.pk},
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, TeamInvitationStatus.REVOKED)
        self.assertTrue(invitation.user.is_active)
        self.assertFalse(
            TeamMembership.objects.get(owner=self.owner, user=invitation.user).is_active
        )
        other_membership.refresh_from_db()
        self.assertTrue(other_membership.is_active)

    def test_deactivate_and_reactivate_only_affect_current_owner_assignments(self):
        manager = User.objects.create_user(
            email="shared-manager@example.com",
            password="Manager-Pass-2026",
            role=UserRole.PROPERTY_MANAGER,
        )
        property_one = self.create_property(owner=self.owner, code="TEAM-ONE")
        second_owner = User.objects.create_user(
            email="assigning-owner@example.com",
            password="Owner-Pass-2026",
            role=UserRole.OWNER,
        )
        property_two = self.create_property(owner=second_owner, code="TEAM-TWO")
        first_assignment = PropertyAssignmentService.assign_manager(
            property_obj=property_one,
            manager_email=manager.email,
            assigned_by=self.owner,
        )
        second_assignment = PropertyAssignmentService.assign_manager(
            property_obj=property_two,
            manager_email=manager.email,
            assigned_by=second_owner,
        )
        preexisting_inactive = PropertyAssignment.objects.create(
            property_id=property_one.pk,
            manager=manager,
            assigned_date=timezone.localdate() - timedelta(days=1),
            is_active=False,
        )

        self.client.force_authenticate(self.owner)
        member = self.client.get(reverse("team:team-member-list")).data["results"][0]
        deactivate_response = self.client.post(
            reverse(
                "team:team-member-deactivate",
                kwargs={"pk": manager.pk},
            ),
            {},
            format="json",
        )

        self.assertEqual(
            deactivate_response.status_code,
            status.HTTP_200_OK,
            deactivate_response.data,
        )
        manager.refresh_from_db()
        first_assignment.refresh_from_db()
        second_assignment.refresh_from_db()
        preexisting_inactive.refresh_from_db()
        self.assertTrue(manager.is_active)
        self.assertFalse(first_assignment.is_active)
        self.assertTrue(first_assignment.suspended_by_membership)
        self.assertTrue(second_assignment.is_active)
        self.assertFalse(preexisting_inactive.is_active)
        self.assertEqual(member["assignment_count"], 1)

        reactivate_response = self.client.post(
            reverse(
                "team:team-member-reactivate",
                kwargs={"pk": manager.pk},
            ),
            {},
            format="json",
        )

        self.assertEqual(
            reactivate_response.status_code,
            status.HTTP_200_OK,
            reactivate_response.data,
        )
        first_assignment.refresh_from_db()
        second_assignment.refresh_from_db()
        preexisting_inactive.refresh_from_db()
        self.assertTrue(first_assignment.is_active)
        self.assertFalse(first_assignment.suspended_by_membership)
        self.assertTrue(second_assignment.is_active)
        self.assertFalse(preexisting_inactive.is_active)

    def test_team_list_filters_role_status_search_and_counts_assignments(self):
        self.invite(
            email="search-manager@example.com",
            first_name="Hodan",
            last_name="Manager",
        )
        manager = User.objects.get(email="search-manager@example.com")
        property_obj = self.create_property(owner=self.owner, code="TEAM-SEARCH")
        PropertyAssignmentService.assign_manager(
            property_obj=property_obj,
            manager_email=manager.email,
            assigned_by=self.owner,
        )

        response = self.client.get(
            reverse("team:team-member-list"),
            {
                "role": UserRole.PROPERTY_MANAGER,
                "status": "pending",
                "search": "search-manager",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        member = response.data["results"][0]
        self.assertEqual(member["role"], UserRole.PROPERTY_MANAGER)
        self.assertEqual(member["status"], "PENDING")
        self.assertEqual(member["assignment_count"], 1)
        self.assertEqual(member["full_name"], "Hodan Manager")

        details = self.client.get(
            reverse("team:team-member-detail", kwargs={"pk": manager.pk})
        )
        self.assertEqual(details.status_code, status.HTTP_200_OK)
        self.assertEqual(len(details.data["assignments"]), 1)
        self.assertEqual(
            details.data["assignments"][0]["property_name"],
            property_obj.name,
        )

    def test_owner_cannot_view_another_owners_team_member(self):
        invite_response = self.invite()
        invitation = TeamInvitation.objects.get(pk=invite_response.data["id"])
        other_owner = User.objects.create_user(
            email="unrelated-owner@example.com",
            password="Owner-Pass-2026",
            role=UserRole.OWNER,
        )
        self.client.force_authenticate(other_owner)

        response = self.client.get(
            reverse("team:team-member-detail", kwargs={"pk": invitation.user_id})
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_owner_cannot_revoke_another_owners_invitation(self):
        create_response = self.invite()
        invitation = TeamInvitation.objects.get(pk=create_response.data["id"])
        other_owner = User.objects.create_user(
            email="invitation-owner@example.com",
            password="Owner-Pass-2026",
            role=UserRole.OWNER,
        )
        self.client.force_authenticate(other_owner)

        response = self.client.post(
            reverse(
                "team:team-invitation-revoke",
                kwargs={"pk": invitation.pk},
            ),
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        invitation.refresh_from_db()
        self.assertEqual(invitation.status, TeamInvitationStatus.PENDING)
