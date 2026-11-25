from rest_framework.routers import DefaultRouter

from .views import LeaseViewSet, RenewalAlertViewSet, TenantViewSet

app_name = "leases"

router = DefaultRouter()
router.register("tenants", TenantViewSet, basename="tenant")
router.register("leases", LeaseViewSet, basename="lease")
router.register("renewal-alerts", RenewalAlertViewSet, basename="renewal-alert")

urlpatterns = router.urls
