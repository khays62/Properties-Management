from rest_framework.routers import DefaultRouter

from .views import TeamInvitationViewSet, TeamMemberViewSet

app_name = "team"

router = DefaultRouter()
router.register(
    "team/invitations",
    TeamInvitationViewSet,
    basename="team-invitation",
)
router.register("team", TeamMemberViewSet, basename="team-member")

urlpatterns = router.urls
