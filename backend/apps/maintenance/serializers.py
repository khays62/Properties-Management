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


class MaintenanceTicketSerializer(serializers.ModelSerializer):
    tenant = serializers.PrimaryKeyRelatedField(
        queryset=Tenant.objects.all(),
        required=False,
    )
    unit = serializers.PrimaryKeyRelatedField(queryset=Unit.objects.all())

    class Meta:
        model = MaintenanceTicket
        fields = (
            "id",
            "tenant",
            "unit",
            "title",
            "description",
            "category",
            "priority",
            "assigned_to",
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
    class Meta:
        model = MaintenanceActivity
        fields = ("id", "ticket", "action", "performed_by", "notes", "created_at")
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
