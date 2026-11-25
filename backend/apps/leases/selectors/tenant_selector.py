from django.db.models import Count, Q, QuerySet

from apps.accounts.models import User
from apps.properties.selectors.property_selector import PropertySelector

from ..models import Tenant


class TenantSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[Tenant]:
        return (
            Tenant.objects.filter(
                leases__unit__property__in=PropertySelector.get_queryset(user)
            )
            .select_related("user")
            .distinct()
        )

    @classmethod
    def get_tenants(
        cls,
        *,
        user: User,
        status: str | None = None,
        search: str | None = None,
    ) -> QuerySet[Tenant]:
        queryset = cls.get_queryset(user=user)
        if status:
            queryset = queryset.filter(status=status)
        if search:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search)
                | Q(user__last_name__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__phone_number__icontains=search)
            )
        return queryset

    @classmethod
    def get_status_counts(cls, *, user: User) -> dict[str, int]:
        return {
            entry["status"]: entry["total"]
            for entry in cls.get_queryset(user=user)
            .values("status")
            .annotate(total=Count("id"))
        }

    @classmethod
    def user_can_manage_tenant(cls, user: User, tenant: Tenant) -> bool:
        return cls.get_queryset(user=user).filter(pk=tenant.pk).exists()
