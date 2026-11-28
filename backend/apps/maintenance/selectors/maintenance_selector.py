from uuid import UUID

from django.db.models import Count, Q, QuerySet

from apps.accounts.models import User
from apps.leases.models import Tenant
from apps.properties.models import Unit
from apps.properties.selectors.property_selector import PropertySelector
from common.constants import (
    MaintenancePriority,
    MaintenanceStatus,
    UserRole,
)
from common.permissions import has_role

from ..models import MaintenanceAttachment, MaintenanceTicket


MANAGER_ROLES = (UserRole.OWNER, UserRole.PROPERTY_MANAGER)


class MaintenanceSelector:
    @staticmethod
    def get_queryset(*, user: User) -> QuerySet[MaintenanceTicket]:
        queryset = MaintenanceTicket.objects.select_related(
            "tenant",
            "tenant__user",
            "unit",
            "unit__property",
            "assigned_to",
        )
        if has_role(user, MANAGER_ROLES):
            return queryset.filter(
                unit__property__in=PropertySelector.get_queryset(user)
            )
        if Tenant.objects.filter(user=user).exists():
            return queryset.filter(tenant__user=user)
        return queryset.none()

    @staticmethod
    def user_can_access_ticket(*, user: User, ticket: MaintenanceTicket) -> bool:
        if has_role(user, MANAGER_ROLES):
            return PropertySelector.user_can_manage_property(
                user,
                ticket.unit.property,
            )
        return (
            has_role(user, (UserRole.TENANT,))
            and ticket.tenant.user_id == user.pk
        )

    @classmethod
    def get_tickets(
        cls,
        *,
        user: User,
        status: str | None = None,
        priority: str | None = None,
        category: str | None = None,
        tenant_id: str | None = None,
        property_id: str | None = None,
        unit_id: str | None = None,
        assigned_to_id: str | None = None,
        search: str | None = None,
    ) -> QuerySet[MaintenanceTicket]:
        queryset = cls.get_queryset(user=user)
        if status:
            queryset = queryset.filter(status=status)
        if priority:
            queryset = queryset.filter(priority=priority)
        if category:
            queryset = queryset.filter(category=category)
        for value, lookup in (
            (tenant_id, "tenant_id"),
            (property_id, "unit__property_id"),
            (unit_id, "unit_id"),
        ):
            if value:
                try:
                    object_id = UUID(value)
                except (TypeError, ValueError):
                    return queryset.none()
                queryset = queryset.filter(**{lookup: object_id})
        if assigned_to_id:
            try:
                assigned_user_id = UUID(assigned_to_id)
            except (TypeError, ValueError):
                name_search = Q()
                for token in assigned_to_id.split():
                    name_search &= (
                        Q(assigned_to__first_name__icontains=token)
                        | Q(assigned_to__last_name__icontains=token)
                        | Q(assigned_to__email__icontains=token)
                    )
                queryset = queryset.filter(
                    name_search
                )
            else:
                queryset = queryset.filter(assigned_to_id=assigned_user_id)
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search)
                | Q(description__icontains=search)
                | Q(tenant__user__email__icontains=search)
                | Q(tenant__user__first_name__icontains=search)
                | Q(tenant__user__last_name__icontains=search)
                | Q(unit__unit_number__icontains=search)
                | Q(unit__property__name__icontains=search)
                | Q(unit__property__code__icontains=search)
            )
        return queryset

    @classmethod
    def get_attachments(cls, *, user: User) -> QuerySet[MaintenanceAttachment]:
        return MaintenanceAttachment.objects.select_related(
            "ticket",
            "ticket__tenant__user",
            "ticket__unit__property",
        ).filter(ticket__in=cls.get_queryset(user=user))

    @classmethod
    def get_open_count(cls, *, user: User) -> int:
        return cls.get_queryset(user=user).filter(
            status=MaintenanceStatus.OPEN
        ).count()

    @classmethod
    def get_priority_counts(cls, *, user: User) -> dict[str, int]:
        counts = {
            entry["priority"]: entry["total"]
            for entry in cls.get_queryset(user=user)
            .values("priority")
            .annotate(total=Count("id"))
        }
        return {
            priority.value.lower(): counts.get(priority.value, 0)
            for priority in MaintenancePriority
        }
