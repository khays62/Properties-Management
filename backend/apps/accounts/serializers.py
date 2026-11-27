from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from common.constants import UserRole

from .models import TeamInvitation, User, UserProfile
from .selectors.user_selector import UserSelector


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone_number",
            "role",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class LoginTokenSerializer(TokenObtainPairSerializer):
    def validate(self, attrs: dict[str, object]) -> dict[str, object]:
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "role",
        )
        read_only_fields = fields


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = (
            "user",
            "avatar",
            "address",
            "city",
            "country",
            "date_of_birth",
            "emergency_contact",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("user", "created_at", "updated_at")


class TenantPasswordSetupSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )


class TeamMemberAssignmentSerializer(serializers.Serializer):
    property_id = serializers.UUIDField()
    property_name = serializers.CharField()
    property_city = serializers.CharField()
    assigned_date = serializers.DateField()
    is_active = serializers.BooleanField()


class TeamMemberInvitationSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamInvitation
        fields = ("id", "status", "expires_at", "created_at")
        read_only_fields = fields


class TeamMemberSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    status = serializers.CharField(source="team_status", read_only=True)
    assignment_count = serializers.IntegerField(read_only=True)
    invitation = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "role",
            "status",
            "created_at",
            "assignment_count",
            "invitation",
        )
        read_only_fields = fields

    def get_full_name(self, obj: User) -> str:
            full_name = f"{obj.first_name} {obj.last_name}".strip()
            return full_name or obj.email

    def get_invitation(self, obj: User):
            invitations = getattr(obj, "team_invitations_for_owner", ())
            if not invitations:
                return None
            return TeamMemberInvitationSummarySerializer(invitations[0]).data


class TeamMemberDetailSerializer(TeamMemberSerializer):
    assignments = serializers.SerializerMethodField()

    class Meta(TeamMemberSerializer.Meta):
        fields = TeamMemberSerializer.Meta.fields + ("assignments",)

    def get_assignments(self, obj: User) -> list[dict]:
        request = self.context.get("request")
        if request is None:
            return []
        assignments = UserSelector.get_member_assignments(
            owner=request.user,
            user=obj,
        )
        return TeamMemberAssignmentSerializer(assignments, many=True).data


class TeamInvitationCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )
    last_name = serializers.CharField(
        max_length=150,
        required=False,
        allow_blank=True,
    )
    role = serializers.ChoiceField(
        choices=(
            (UserRole.PROPERTY_MANAGER, "Property Manager"),
            (UserRole.ACCOUNTANT, "Accountant"),
        )
    )

    def validate_email(self, value: str) -> str:
        return value.strip().lower()


class TeamInvitationAcceptSerializer(serializers.Serializer):
    invitation = serializers.UUIDField()
    token = serializers.CharField(trim_whitespace=False)
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
    )


class InvitationSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeamInvitation
        fields = (
            "id",
            "user",
            "email",
            "role",
            "invited_by",
            "status",
            "expires_at",
            "accepted_at",
            "created_at",
        )
        read_only_fields = fields
