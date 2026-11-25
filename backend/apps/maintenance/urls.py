from rest_framework.routers import DefaultRouter

from .views import (
    MaintenanceActivityViewSet,
    MaintenanceAttachmentViewSet,
    MaintenanceTicketViewSet,
)

app_name = "maintenance"

router = DefaultRouter()
router.register("maintenance-tickets", MaintenanceTicketViewSet, basename="ticket")
router.register(
    "maintenance-attachments",
    MaintenanceAttachmentViewSet,
    basename="attachment",
)
router.register(
    "maintenance-activities",
    MaintenanceActivityViewSet,
    basename="activity",
)

urlpatterns = router.urls
