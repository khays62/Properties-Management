from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.models import User
from apps.applications.models import RentalApplication

from .models import Lease, LeaseStatusHistory, RenewalAlert, Tenant


class TenantSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    def validate_user(self, user: User) -> User:
        if self.instance is not None and self.instance.user_id != user.pk:
            raise serializers.ValidationError(
                "Tenant profiles cannot be reassigned to another user."
            )
        return user

    class Meta:
        model = Tenant
        fields = (
            "id",
            "user",
            "emergency_contact_name",
            "emergency_contact_phone",
            "occupation",
            "notes",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "status", "created_at", "updated_at")


class LeaseSerializer(serializers.ModelSerializer):
    application = serializers.PrimaryKeyRelatedField(
        queryset=RentalApplication.objects.all()
    )
    tenant = serializers.PrimaryKeyRelatedField(read_only=True)
    unit = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Lease
        fields = (
            "id",
            "tenant",
            "unit",
            "application",
            "start_date",
            "end_date",
            "monthly_rent",
            "deposit_amount",
            "payment_due_day",
            "status",
            "approved_by",
            "approved_at",
            "notes",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "tenant",
            "unit",
            "status",
            "approved_by",
            "approved_at",
            "created_at",
            "updated_at",
        )

    def validate(self, attrs):
        application = attrs.get(
            "application",
            getattr(self.instance, "application", None),
        )
        if application is None:
            return attrs
        candidate = Lease(
            pk=getattr(self.instance, "pk", None),
            tenant=getattr(self.instance, "tenant", None),
            unit=application.listing.unit,
            application=application,
            start_date=attrs.get(
                "start_date",
                getattr(self.instance, "start_date", None),
            ),
            end_date=attrs.get("end_date", getattr(self.instance, "end_date", None)),
            monthly_rent=attrs.get(
                "monthly_rent",
                getattr(self.instance, "monthly_rent", None),
            ),
            deposit_amount=attrs.get(
                "deposit_amount",
                getattr(self.instance, "deposit_amount", None),
            ),
            payment_due_day=attrs.get(
                "payment_due_day",
                getattr(self.instance, "payment_due_day", None),
            ),
            status=getattr(self.instance, "status", None),
        )
        try:
            candidate.clean()
        except DjangoValidationError as exc:
            detail = exc.message_dict if hasattr(exc, "message_dict") else exc.messages
            raise serializers.ValidationError(detail) from exc
        return attrs


class LeaseStatusHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = LeaseStatusHistory
        fields = (
            "id",
            "old_status",
            "new_status",
            "changed_by",
            "change_reason",
            "created_at",
        )
        read_only_fields = fields


class LeaseDetailSerializer(LeaseSerializer):
    status_history = LeaseStatusHistorySerializer(many=True, read_only=True)

    class Meta(LeaseSerializer.Meta):
        fields = LeaseSerializer.Meta.fields + ("status_history",)


class RenewalAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = RenewalAlert
        fields = (
            "id",
            "lease",
            "alert_date",
            "days_before_expiry",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class LeaseRenewalSerializer(serializers.Serializer):
    new_end_date = serializers.DateField()
