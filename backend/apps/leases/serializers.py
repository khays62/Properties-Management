from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.accounts.models import User
from apps.applications.models import RentalApplication

from .models import Lease, LeaseStatusHistory, RenewalAlert, Tenant


def user_display_name(user: User) -> str:
    return f"{user.first_name} {user.last_name}".strip() or user.email


class TenantSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    user_name = serializers.SerializerMethodField()
    user_email = serializers.EmailField(source="user.email", read_only=True)

    @staticmethod
    def get_user_name(tenant: Tenant) -> str:
        return user_display_name(tenant.user)

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
            "user_name",
            "user_email",
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
    tenant_name = serializers.SerializerMethodField()
    tenant_email = serializers.EmailField(source="tenant.user.email", read_only=True)
    lease_label = serializers.SerializerMethodField()
    application_name = serializers.SerializerMethodField()
    application_listing_title = serializers.CharField(
        source="application.listing.title",
        read_only=True,
    )
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
    approved_by_name = serializers.SerializerMethodField()

    @staticmethod
    def get_tenant_name(lease: Lease) -> str:
        return user_display_name(lease.tenant.user)

    @staticmethod
    def get_lease_label(lease: Lease) -> str:
        tenant = user_display_name(lease.tenant.user)
        return f"{tenant} - Unit {lease.unit.unit_number}"

    @staticmethod
    def get_application_name(lease: Lease) -> str:
        applicant = lease.application.applicant
        return (
            f"{applicant.first_name} {applicant.last_name}".strip()
            or applicant.email
        )

    @staticmethod
    def get_approved_by_name(lease: Lease) -> str | None:
        if lease.approved_by is None:
            return None
        return user_display_name(lease.approved_by)

    class Meta:
        model = Lease
        fields = (
            "id",
            "tenant",
            "tenant_name",
            "tenant_email",
            "lease_label",
            "unit",
            "unit_number",
            "unit_status",
            "property_name",
            "property_code",
            "application",
            "application_name",
            "application_listing_title",
            "start_date",
            "end_date",
            "monthly_rent",
            "deposit_amount",
            "payment_due_day",
            "status",
            "approved_by",
            "approved_by_name",
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
    changed_by_name = serializers.SerializerMethodField()

    @staticmethod
    def get_changed_by_name(history: LeaseStatusHistory) -> str | None:
        if history.changed_by is None:
            return None
        return user_display_name(history.changed_by)

    class Meta:
        model = LeaseStatusHistory
        fields = (
            "id",
            "old_status",
            "new_status",
            "changed_by",
            "changed_by_name",
            "change_reason",
            "created_at",
        )
        read_only_fields = fields


class LeaseDetailSerializer(LeaseSerializer):
    status_history = LeaseStatusHistorySerializer(many=True, read_only=True)

    class Meta(LeaseSerializer.Meta):
        fields = LeaseSerializer.Meta.fields + ("status_history",)


class RenewalAlertSerializer(serializers.ModelSerializer):
    lease_label = serializers.SerializerMethodField()
    tenant_name = serializers.SerializerMethodField()
    unit_number = serializers.CharField(source="lease.unit.unit_number", read_only=True)
    property_name = serializers.CharField(
        source="lease.unit.property.name",
        read_only=True,
    )

    @staticmethod
    def get_lease_label(alert: RenewalAlert) -> str:
        lease = alert.lease
        tenant = user_display_name(lease.tenant.user)
        return f"{tenant} - Unit {lease.unit.unit_number}"

    @staticmethod
    def get_tenant_name(alert: RenewalAlert) -> str:
        user = alert.lease.tenant.user
        return user_display_name(user)

    class Meta:
        model = RenewalAlert
        fields = (
            "id",
            "lease",
            "lease_label",
            "tenant_name",
            "unit_number",
            "property_name",
            "alert_date",
            "days_before_expiry",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class LeaseRenewalSerializer(serializers.Serializer):
    new_end_date = serializers.DateField()
