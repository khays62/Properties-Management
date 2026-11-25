from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import (
    CurrentUserSerializer,
    LoginTokenSerializer,
    TenantPasswordSetupSerializer,
)
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
