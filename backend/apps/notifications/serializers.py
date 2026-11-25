from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ("id", "title", "type", "is_read", "created_at")
        read_only_fields = fields


class NotificationDetailSerializer(NotificationSerializer):
    class Meta(NotificationSerializer.Meta):
        fields = NotificationSerializer.Meta.fields + ("user", "message")
