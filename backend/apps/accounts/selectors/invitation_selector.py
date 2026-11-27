from django.db.models import QuerySet

from apps.accounts.models import TeamInvitation, User


class InvitationSelector:
    @staticmethod
    def get_owner_invitations(*, owner: User) -> QuerySet[TeamInvitation]:
        return TeamInvitation.objects.filter(invited_by=owner).select_related(
            "user",
            "invited_by",
        )

    @classmethod
    def get_owner_invitation(
        cls,
        *,
        owner: User,
        invitation_id: str,
    ) -> TeamInvitation | None:
        return cls.get_owner_invitations(owner=owner).filter(
            pk=invitation_id
        ).first()
