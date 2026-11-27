from rest_framework import mixins, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework_simplejwt.views import TokenObtainPairView

from common.constants import UserRole

from .models import TeamInvitation
from .permissions.team_permissions import CanManageTeam
from .serializers import (
    CurrentUserSerializer,
    InvitationSerializer,
    LoginTokenSerializer,
    TeamInvitationAcceptSerializer,
    TeamInvitationCreateSerializer,
    TeamMemberDetailSerializer,
    TeamMemberSerializer,
    TenantPasswordSetupSerializer,
)
from .services.invitation_service import InvitationService
from .services.team_management_service import TeamManagementService
from .services.tenant_invitation_service import TenantInvitationService


class LoginView(TokenObtainPairView):
    serializer_class = LoginTokenSerializer


class CurrentUserView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request: Request) -> Response:
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data)


class TenantPasswordSetupView(APIView):
    authentication_classes = ()
    permission_classes = ()

    def post(self, request: Request) -> Response:
        serializer = TenantPasswordSetupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        TenantInvitationService.set_password(**serializer.validated_data)
        return Response({"detail": "Password set successfully."})


class TeamMemberViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (CanManageTeam,)

    def get_queryset(self):
        return TeamManagementService.get_team_members(
            owner=self.request.user,
            role=self.request.query_params.get("role"),
            status=self.request.query_params.get("status"),
            search=self.request.query_params.get("search"),
        )

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        if self.action == "retrieve":
            return TeamMemberDetailSerializer
        return TeamMemberSerializer

    @action(detail=True, methods=["post"], url_path="deactivate")
    def deactivate(self, request: Request, pk: str | None = None) -> Response:
        user = self.get_object()
        TeamManagementService.deactivate_user(owner=request.user, user=user)
        member = TeamManagementService.get_team_member(
            owner=request.user,
            user_id=str(user.pk),
        )
        return Response(
            TeamMemberDetailSerializer(
                member,
                context=self.get_serializer_context(),
            ).data
        )

    @action(detail=True, methods=["post"], url_path="reactivate")
    def reactivate(self, request: Request, pk: str | None = None) -> Response:
        user = self.get_object()
        TeamManagementService.reactivate_user(owner=request.user, user=user)
        member = TeamManagementService.get_team_member(
            owner=request.user,
            user_id=str(user.pk),
        )
        return Response(
            TeamMemberDetailSerializer(
                member,
                context=self.get_serializer_context(),
            ).data
        )


class TeamInvitationViewSet(
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (CanManageTeam,)
    serializer_class = InvitationSerializer
    queryset = TeamInvitation.objects.select_related("user", "invited_by")

    def create(self, request: Request) -> Response:
        input_serializer = TeamInvitationCreateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        values = input_serializer.validated_data
        invite = (
            TeamManagementService.invite_manager
            if values["role"] == UserRole.PROPERTY_MANAGER
            else TeamManagementService.invite_accountant
        )
        invitation, email_sent = invite(
            owner=request.user,
            email=values["email"],
            first_name=values.get("first_name", ""),
            last_name=values.get("last_name", ""),
        )
        return Response(
            InvitationSerializer(invitation).data,
            status=(
                status.HTTP_201_CREATED
                if email_sent
                else status.HTTP_200_OK
            ),
        )

    @action(detail=True, methods=["post"], url_path="resend")
    def resend(self, request: Request, pk: str | None = None) -> Response:
        invitation = InvitationService.resend_invitation(
            owner=request.user,
            invitation_id=str(pk),
        )
        return Response(InvitationSerializer(invitation).data)

    @action(detail=True, methods=["post"], url_path="revoke")
    def revoke(self, request: Request, pk: str | None = None) -> Response:
        invitation = InvitationService.revoke_invitation(
            owner=request.user,
            invitation_id=str(pk),
        )
        return Response(InvitationSerializer(invitation).data)

    @action(
        detail=False,
        methods=["post"],
        url_path="accept",
        permission_classes=(AllowAny,),
        authentication_classes=(),
    )
    def accept(self, request: Request) -> Response:
        input_serializer = TeamInvitationAcceptSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        values = input_serializer.validated_data
        invitation = InvitationService.accept_invitation(
            invitation_id=str(values["invitation"]),
            token=values["token"],
            new_password=values["new_password"],
        )
        return Response(InvitationSerializer(invitation).data)
