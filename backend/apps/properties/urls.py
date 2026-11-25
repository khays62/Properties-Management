from rest_framework.routers import DefaultRouter

from .views import PropertyViewSet, UnitImageViewSet, UnitViewSet

app_name = "properties"

router = DefaultRouter()
router.register("properties", PropertyViewSet, basename="property")
router.register("units", UnitViewSet, basename="unit")
router.register("unit-images", UnitImageViewSet, basename="unit-image")

urlpatterns = router.urls
