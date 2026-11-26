from decimal import Decimal

from rest_framework import serializers

from apps.leases.models import Lease, Tenant

from .models import (
    Deposit,
    Invoice,
    Payment,
    PaymentAllocation,
    Receipt,
    RentCharge,
    RentSchedule,
)


class InvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Invoice
        fields = ("id", "rent_charge", "invoice_number", "issued_date")
        read_only_fields = fields


class DepositSerializer(serializers.ModelSerializer):
    lease = serializers.PrimaryKeyRelatedField(queryset=Lease.objects.all())

    class Meta:
        model = Deposit
        fields = (
            "id",
            "lease",
            "required_amount",
            "paid_amount",
            "reference_number",
            "payment_date",
            "payment_method",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "required_amount",
            "paid_amount",
            "reference_number",
            "payment_date",
            "payment_method",
            "status",
            "created_at",
            "updated_at",
        )


class DepositPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
    )
    reference_number = serializers.CharField(max_length=100)
    payment_date = serializers.DateField(required=False)
    payment_method = serializers.ChoiceField(
        choices=Deposit._meta.get_field("payment_method").choices,
    )


class DepositRefundSerializer(serializers.Serializer):
    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        min_value=Decimal("0.01"),
        required=False,
    )


class RentScheduleSerializer(serializers.ModelSerializer):
    lease = serializers.PrimaryKeyRelatedField(queryset=Lease.objects.all())
    due_day = serializers.IntegerField(min_value=1, max_value=31, required=False)

    def validate_lease(self, lease: Lease) -> Lease:
        if self.instance is not None and self.instance.lease_id != lease.pk:
            raise serializers.ValidationError(
                "A rent schedule cannot be reassigned to another lease."
            )
        return lease

    class Meta:
        model = RentSchedule
        fields = (
            "id",
            "lease",
            "due_day",
            "frequency",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


class RentChargeSerializer(serializers.ModelSerializer):
    tenant = serializers.UUIDField(source="lease.tenant_id", read_only=True)
    invoice_number = serializers.CharField(
        source="invoice.invoice_number",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = RentCharge
        fields = (
            "id",
            "lease",
            "tenant",
            "invoice_number",
            "billing_month",
            "billing_year",
            "amount",
            "balance",
            "due_date",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class RentChargeGenerateSerializer(serializers.Serializer):
    billing_month = serializers.IntegerField(min_value=1, max_value=12)
    billing_year = serializers.IntegerField(min_value=1, max_value=9999)


class PaymentAllocationSerializer(serializers.ModelSerializer):
    rent_charge = serializers.PrimaryKeyRelatedField(
        queryset=RentCharge.objects.all()
    )

    class Meta:
        model = PaymentAllocation
        fields = ("id", "payment", "rent_charge", "amount_allocated")
        read_only_fields = ("id", "payment")


class AllocatePaymentSerializer(serializers.Serializer):
    allocations = PaymentAllocationSerializer(many=True, allow_empty=False)


class PaymentSerializer(serializers.ModelSerializer):
    tenant = serializers.PrimaryKeyRelatedField(queryset=Tenant.objects.all())

    class Meta:
        model = Payment
        fields = (
            "id",
            "tenant",
            "amount",
            "payment_date",
            "reference_number",
            "payment_method",
            "notes",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "status", "created_at", "updated_at")


class PaymentDetailSerializer(PaymentSerializer):
    allocations = PaymentAllocationSerializer(many=True, read_only=True)

    class Meta(PaymentSerializer.Meta):
        fields = PaymentSerializer.Meta.fields + ("allocations",)


class ReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = (
            "id",
            "payment",
            "receipt_number",
            "generated_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields
