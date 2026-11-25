from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.request import Request
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import CurrentUserSerializer, LoginTokenSerializer


class LoginView(TokenObtainPairView):
    serializer_class = LoginTokenSerializer


class CurrentUserView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request: Request) -> Response:
        serializer = CurrentUserSerializer(request.user)
        return Response(serializer.data)
