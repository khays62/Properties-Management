from rest_framework import serializers

from .models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = (
            "id",
            "user",
            "action",
            "model_name",
            "object_id",
            "created_at",
        )
        read_only_fields = fields


class AuditLogDetailSerializer(AuditLogSerializer):
    class Meta(AuditLogSerializer.Meta):
        fields = AuditLogSerializer.Meta.fields + (
            "old_data",
            "new_data",
            "ip_address",
            "user_agent",
        )
