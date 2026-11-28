from uuid import UUID

from django.db.models import Count, Q, QuerySet

from apps.accounts.models import User
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import RenewalAlertStatus, UserRole
from common.permissions import has_role

from ..models import RenewalAlert, Tenant


class RenewalSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[RenewalAlert]:
        queryset = RenewalAlert.objects.select_related(
            "lease",
            "lease__tenant",
            "lease__tenant__user",
            "lease__unit",
            "lease__unit__property",
        )
        if has_role(user, (UserRole.OWNER, UserRole.PROPERTY_MANAGER)):
            return queryset.filter(
                lease__unit__property__in=PropertySelector.get_queryset(user)
            )
        if Tenant.objects.filter(user=user).exists():
            return queryset.filter(lease__tenant__user=user)
        return queryset.none()

    @classmethod
    def get_alerts(
        cls,
        *,
        user: User,
        status: str | None = None,
        lease_id: str | None = None,
        property_id: str | None = None,
    ) -> QuerySet[RenewalAlert]:
        queryset = cls.get_queryset(user=user)
        if status:
            queryset = queryset.filter(status=status)
        for value, lookup in (
            (lease_id, "lease_id"),
            (property_id, "lease__unit__property_id"),
        ):
            if value:
                try:
                    object_id = UUID(value)
                except (TypeError, ValueError):
                    name_search = Q()
                    for token in value.split():
                        name_search &= (
                            Q(lease__tenant__user__first_name__icontains=token)
                            | Q(lease__tenant__user__last_name__icontains=token)
                            | Q(lease__tenant__user__email__icontains=token)
                        )
                    if lookup == "lease_id":
                        queryset = queryset.filter(
                            name_search
                            | Q(lease__unit__unit_number__icontains=value)
                            | Q(lease__unit__property__name__icontains=value)
                        )
                    else:
                        return queryset.none()
                else:
                    queryset = queryset.filter(**{lookup: object_id})
        return queryset

    @classmethod
    def get_status_counts(cls, *, user: User) -> dict[str, int]:
        counts = {
            entry["status"]: entry["total"]
            for entry in cls.get_queryset(user=user)
            .values("status")
            .annotate(total=Count("id"))
        }
        return {
            status.value.lower(): counts.get(status.value, 0)
            for status in RenewalAlertStatus
        }
