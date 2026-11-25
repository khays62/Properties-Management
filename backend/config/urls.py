from django.contrib import admin
from django.urls import include, path

from config.health import HealthCheckView


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", HealthCheckView.as_view(), name="health"),
    path("api/v1/auth/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.properties.urls")),
    path("api/v1/", include("apps.listings.urls")),
]
