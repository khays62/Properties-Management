from django.db.models import Count, Q, QuerySet

from apps.accounts.models import PropertyAssignment
from apps.accounts.models import User
from common.constants import PropertyStatus, UserRole
from common.permissions import has_role

from ..models import Property


class PropertySelector:
    @staticmethod
    def get_queryset(user: User) -> QuerySet[Property]:
        if has_role(user, (UserRole.OWNER,)):
            return Property.objects.filter(owner=user).select_related("owner")
        if has_role(user, (UserRole.PROPERTY_MANAGER,)):
            assigned_property_ids = PropertyAssignment.objects.filter(
                manager=user,
                is_active=True,
            ).values("property_id")
            return Property.objects.filter(
                id__in=assigned_property_ids
            ).select_related("owner")
        return Property.objects.none()

    @staticmethod
    def user_can_manage_property(user: User, property_obj: Property) -> bool:
        if has_role(user, (UserRole.OWNER,)):
            return property_obj.owner_id == user.pk
        if has_role(user, (UserRole.PROPERTY_MANAGER,)):
            return PropertyAssignment.objects.filter(
                property_id=property_obj.pk,
                manager=user,
                is_active=True,
            ).exists()
        return False

    @classmethod
    def get_properties(
        cls,
        *,
        user: User,
        status: str | None = None,
        city: str | None = None,
        search: str | None = None,
    ) -> QuerySet[Property]:
        queryset = cls.get_queryset(user)
        if status:
            queryset = queryset.filter(status=status)
        if city:
            queryset = queryset.filter(city__icontains=city)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(code__icontains=search)
                | Q(description__icontains=search)
                | Q(address__icontains=search)
                | Q(city__icontains=search)
                | Q(country__icontains=search)
            )
        return queryset

    @classmethod
    def get_status_statistics(cls, *, user) -> dict[str, int]:
        counts = {
            entry["status"]: entry["total"]
            for entry in cls.get_queryset(user)
            .values("status")
            .annotate(total=Count("id"))
        }
        return {
            status.value.lower(): counts.get(status.value, 0)
            for status in PropertyStatus
        }
