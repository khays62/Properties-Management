import logging

from django.db import DatabaseError, connection
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


logger = logging.getLogger(__name__)


class HealthCheckView(APIView):
    authentication_classes = ()
    permission_classes = (AllowAny,)

    def get(self, request) -> Response:
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
        except DatabaseError:
            logger.exception("Health check failed because the database is unavailable.")
            return Response(
                {
                    "status": "unhealthy",
                    "database": "disconnected",
                    "service": "omniproperties-api",
                    "version": "1.0.0",
                },
                status=503,
            )

        return Response(
            {
                "status": "healthy",
                "database": "connected",
                "service": "omniproperties-api",
                "version": "1.0.0",
            }
        )
