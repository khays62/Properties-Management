from unittest.mock import patch
from unittest import TestCase

from django.db import OperationalError
from django.urls import reverse
from rest_framework.test import APIRequestFactory

from config.health import HealthCheckView


class HealthCheckTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.view = HealthCheckView.as_view()

    def test_returns_healthy_when_database_query_succeeds(self):
        with patch("config.health.connection.cursor") as cursor:
            request = self.factory.get(reverse("health"))
            response = self.view(request)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.data,
            {
                "status": "healthy",
                "database": "connected",
                "service": "omniproperties-api",
                "version": "1.0.0",
            },
        )
        cursor.return_value.__enter__.return_value.execute.assert_called_once_with(
            "SELECT 1"
        )

    def test_returns_service_unavailable_when_database_query_fails(self):
        with (
            patch(
                "config.health.connection.cursor",
                side_effect=OperationalError("Database unavailable"),
            ),
            patch("config.health.logger.exception"),
        ):
            request = self.factory.get(reverse("health"))
            response = self.view(request)

        self.assertEqual(response.status_code, 503)
        self.assertEqual(
            response.data,
            {
                "status": "unhealthy",
                "database": "disconnected",
                "service": "omniproperties-api",
                "version": "1.0.0",
            },
        )
