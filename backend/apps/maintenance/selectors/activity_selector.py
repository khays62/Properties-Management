from django.db.models import QuerySet

from apps.accounts.models import User

from ..models import MaintenanceActivity
from .maintenance_selector import MaintenanceSelector


class MaintenanceActivitySelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[MaintenanceActivity]:
        return MaintenanceActivity.objects.select_related(
            "ticket",
            "performed_by",
            "ticket__tenant__user",
            "ticket__unit__property",
        ).filter(ticket__in=MaintenanceSelector.get_queryset(user=user))
