from rest_framework.routers import DefaultRouter

from .views import (
    DepositViewSet,
    PaymentViewSet,
    ReceiptViewSet,
    RentChargeViewSet,
    RentScheduleViewSet,
)

app_name = "finance"

router = DefaultRouter()
router.register("deposits", DepositViewSet, basename="deposit")
router.register("rent-schedules", RentScheduleViewSet, basename="rent-schedule")
router.register("rent-charges", RentChargeViewSet, basename="rent-charge")
router.register("payments", PaymentViewSet, basename="payment")
router.register("receipts", ReceiptViewSet, basename="receipt")

urlpatterns = router.urls
