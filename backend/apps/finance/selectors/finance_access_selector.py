from uuid import UUID

from django.db.models import QuerySet

from apps.accounts.models import User
from apps.leases.models import Lease, Tenant
from apps.leases.selectors.lease_selector import LeaseSelector
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import UserRole
from common.permissions import has_role


class FinanceAccessSelector:
    @staticmethod
    def get_accessible_leases(*, user: User) -> QuerySet[Lease]:
        if has_role(user, (UserRole.ACCOUNTANT,)):
            return Lease.objects.all()
        return LeaseSelector.get_queryset(user=user)

    @classmethod
    def get_accessible_tenants(cls, *, user: User) -> QuerySet[Tenant]:
        if has_role(user, (UserRole.ACCOUNTANT,)):
            return Tenant.objects.all()
        accessible_leases = cls.get_accessible_leases(user=user)
        inaccessible_leases = Lease.objects.exclude(pk__in=accessible_leases)
        return Tenant.objects.filter(
            leases__in=accessible_leases,
        ).exclude(
            leases__in=inaccessible_leases,
        ).distinct()

    @classmethod
    def user_can_manage_tenant(
        cls,
        *,
        user: User,
        tenant_id: UUID,
    ) -> bool:
        return cls.get_accessible_tenants(user=user).filter(pk=tenant_id).exists()

    @classmethod
    def scope_to_leases(
        cls,
        queryset: QuerySet,
        *,
        user: User,
        lease_lookup: str,
    ) -> QuerySet:
        if has_role(user, (UserRole.ACCOUNTANT,)):
            return queryset
        return queryset.filter(
            **{f"{lease_lookup}__in": cls.get_accessible_leases(user=user)}
        )

    @staticmethod
    def user_can_manage_lease(*, user: User, lease: Lease) -> bool:
        if has_role(user, (UserRole.ACCOUNTANT,)):
            return True
        return PropertySelector.user_can_manage_property(
            user,
            lease.unit.property,
        )

