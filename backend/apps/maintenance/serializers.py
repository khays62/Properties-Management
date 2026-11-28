from rest_framework import serializers

from apps.accounts.models import User
from apps.leases.models import Tenant
from apps.properties.models import Unit
from common.constants import UserRole

from .models import (
    MaintenanceActivity,
    MaintenanceAttachment,
    MaintenanceTicket,
)


def user_display_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip() or user.email


class MaintenanceTicketSerializer(serializers.ModelSerializer):
    tenant = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(),
        required=False,
    )
    unit = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all())
    tenant_name = serializers.SerializerMethodField()
    tenant_email = serializers.EmailField(source="tenant.user.email", read_only=True)
    unit_number = serializers.CharField(source="unit.unit_number", read_only=True)
    unit_status = serializers.CharField(source="unit.status", read_only=True)
    property_name = serializers.CharField(
        source="unit.property.name",
        read_only=True,
    )
    property_code = serializers.CharField(
        source="unit.property.code",
        read_only=True,
    )
    assigned_to_name = serializers.SerializerMethodField()

    @staticmethod
    def get_tenant_name(ticket: MaintenanceTicket) -> str:
        return user_display_name(ticket.tenant.user)

    @staticmethod
    def get_assigned_to_name(ticket: MaintenanceTicket) -> str | None:
        if ticket.assigned_to is None:
            return None
        return user_display_name(ticket.assigned_to)

    class Meta:
        model = MaintenanceTicket
        fields = (
            "id",
            "tenant",
            "tenant_name",
            "tenant_email",
            "unit",
            "unit_number",
            "unit_status",
            "property_name",
            "property_code",
            "title",
            "description",
            "category",
            "priority",
            "assigned_to",
            "assigned_to_name",
            "resolution_notes",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "assigned_to",
            "resolution_notes",
            "status",
            "created_at",
            "updated_at",
        )

    def get_fields(self) -> dict[str, serializers.Field]:
        fields = super().get_fields()
        if self.instance is not None:
            fields["tenant"].read_only = True
            fields["unit"].read_only = True
        return fields


class MaintenanceActivitySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()

    @staticmethod
    def get_performed_by_name(activity: MaintenanceActivity) -> str | None:
        if activity.performed_by is None:
            return None
        return user_display_name(activity.performed_by)

    class Meta:
        model = MaintenanceActivity
        fields = (
            "id",
            "ticket",
            "action",
            "performed_by",
            "performed_by_name",
            "notes",
            "created_at",
        )
        read_only_fields = fields


class MaintenanceAttachmentSerializer(serializers.ModelSerializer):
    ticket = serializers.PrimaryKeyRelatedField(
        queryset=MaintenanceTicket.objects.all(),
    )

    class Meta:
        model = MaintenanceAttachment
        fields = ("id", "ticket", "file", "uploaded_at")
        read_only_fields = ("id", "uploaded_at")


class MaintenanceTicketDetailSerializer(MaintenanceTicketSerializer):
    attachments = MaintenanceAttachmentSerializer(many=True, read_only=True)
    activities = MaintenanceActivitySerializer(many=True, read_only=True)

    class Meta(MaintenanceTicketSerializer.Meta):
        fields = MaintenanceTicketSerializer.Meta.fields + (
            "attachments",
            "activities",
        )


class MaintenanceAssignmentSerializer(serializers.Serializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role=UserRole.PROPERTY_MANAGER),
    )
    notes = serializers.CharField(required=False, allow_blank=True)


class MaintenanceTransitionSerializer(serializers.Serializer):
    notes = serializers.CharField(required=False, allow_blank=True)


class MaintenanceResolveSerializer(serializers.Serializer):
    resolution_notes = serializers.CharField()
