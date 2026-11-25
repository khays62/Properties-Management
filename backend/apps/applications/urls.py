from rest_framework.routers import DefaultRouter

from .views import ApplicantViewSet, RentalApplicationViewSet, ScreeningViewSet

app_name = "applications"

router = DefaultRouter()
router.register("applicants", ApplicantViewSet, basename="applicant")
router.register("applications", RentalApplicationViewSet, basename="application")
router.register("screenings", ScreeningViewSet, basename="screening")

urlpatterns = router.urls
