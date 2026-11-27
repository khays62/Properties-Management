from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ListingImageViewSet, ListingViewSet, PublicListingDetailView

app_name = "listings"

router = DefaultRouter()
router.register("listings", ListingViewSet, basename="listing")
router.register("listing-images", ListingImageViewSet, basename="listing-image")

urlpatterns = [
    path(
        "listings/public/<uuid:listing_id>/",
        PublicListingDetailView.as_view(),
        name="listing-public-detail",
    ),
    *router.urls,
]
