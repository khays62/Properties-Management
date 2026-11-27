from django.db.models import (
    Case,
    CharField,
    Count,
    Exists,
    IntegerField,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
    Value,
    When,
)
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.accounts.models import PropertyAssignment, TeamInvitation, User
from apps.properties.models import Property
from common.constants import TeamInvitationStatus, UserRole


class UserSelector:
    @staticmethod
    def get_team_members(
        *,
        owner: User,
        role: str | None = None,
        status: str | None = None,
        search: str | None = None,
    ):
        owned_property_ids = Property.objects.filter(owner=owner).values("pk")
        assignment_counts = (
            PropertyAssignment.objects.filter(
                manager_id=OuterRef("pk"),
                property_id__in=Subquery(owned_property_ids),
                is_active=True,
            )
            .values("manager_id")
            .annotate(total=Count("pk"))
            .values("total")[:1]
        )
        pending_invitations = TeamInvitation.objects.filter(
            invited_by=owner,
            user_id=OuterRef("pk"),
            status=TeamInvitationStatus.PENDING,
            expires_at__gt=timezone.now(),
        )
        expired_invitations = TeamInvitation.objects.filter(
            invited_by=owner,
            user_id=OuterRef("pk"),
            status=TeamInvitationStatus.EXPIRED,
        )
        accepted_invitations = TeamInvitation.objects.filter(
            invited_by=owner,
            user_id=OuterRef("pk"),
            status=TeamInvitationStatus.ACCEPTED,
        )
        queryset = (
            User.objects.filter(
                team_memberships__owner=owner,
                role__in=(UserRole.PROPERTY_MANAGER, UserRole.ACCOUNTANT),
            )
            .annotate(
                assignment_count=Coalesce(
                    Subquery(assignment_counts, output_field=IntegerField()),
                    Value(0),
                    output_field=IntegerField(),
                ),
                has_pending_invitation=Exists(pending_invitations),
                has_expired_invitation=Exists(expired_invitations),
                has_accepted_invitation=Exists(accepted_invitations),
            )
            .annotate(
                team_status=Case(
                    When(
                        Q(team_memberships__is_active=False) | Q(is_active=False),
                        then=Value("INACTIVE"),
                    ),
                    When(has_pending_invitation=True, then=Value("PENDING")),
                    When(has_accepted_invitation=True, then=Value("ACTIVE")),
                    When(has_expired_invitation=True, then=Value("EXPIRED")),
                    default=Value("ACTIVE"),
                    output_field=CharField(),
                )
            )
            .distinct()
            .prefetch_related(
                Prefetch(
                    "team_invitations",
                    queryset=TeamInvitation.objects.filter(
                        invited_by=owner
                    ).order_by("-created_at"),
                    to_attr="team_invitations_for_owner",
                )
            )
        )
        if role:
            queryset = queryset.filter(role=role)
        if status:
            queryset = queryset.filter(team_status=status.upper())
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )
        return queryset.order_by("last_name", "first_name", "email")

    @staticmethod
    def get_team_member(*, owner: User, user_id: str) -> User | None:
        return UserSelector.get_team_members(owner=owner).filter(pk=user_id).first()

    @staticmethod
    def get_member_assignments(*, owner: User, user: User):
        owned_properties = Property.objects.filter(owner=owner)
        return (
            PropertyAssignment.objects.filter(
                manager=user,
                property_id__in=Subquery(owned_properties.values("pk")),
            )
            .annotate(
                property_name=Subquery(
                    owned_properties.filter(
                        pk=OuterRef("property_id")
                    ).values("name")[:1]
                ),
                property_city=Subquery(
                    owned_properties.filter(
                        pk=OuterRef("property_id")
                    ).values("city")[:1]
                ),
            )
            .order_by("-assigned_date", "-created_at")
        )
