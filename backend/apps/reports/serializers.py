from rest_framework import serializers

from common.constants import UserRole


class DashboardSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=UserRole.choices, read_only=True)
    metrics = serializers.DictField(
        child=serializers.JSONField(),
        read_only=True,
    )


class OccupancyReportSerializer(serializers.Serializer):
    total_properties = serializers.IntegerField()
    total_units = serializers.IntegerField()
    occupied_units = serializers.IntegerField()
    available_units = serializers.IntegerField()
    listed_units = serializers.IntegerField()
    maintenance_units = serializers.IntegerField()
    rentable_units = serializers.IntegerField()
    occupancy_rate = serializers.DecimalField(max_digits=7, decimal_places=2)
    vacancy_rate = serializers.DecimalField(max_digits=7, decimal_places=2)


class FinancialSummarySerializer(serializers.Serializer):
    total_rent_billed = serializers.DecimalField(max_digits=16, decimal_places=2)
    total_rent_collected = serializers.DecimalField(max_digits=16, decimal_places=2)
    total_outstanding_balance = serializers.DecimalField(
        max_digits=16,
        decimal_places=2,
    )
    total_overdue_balance = serializers.DecimalField(max_digits=16, decimal_places=2)
    total_security_deposits = serializers.DecimalField(
        max_digits=16,
        decimal_places=2,
    )
    active_deposit_balances = serializers.DecimalField(
        max_digits=16,
        decimal_places=2,
    )


class LeaseReportSerializer(serializers.Serializer):
    active_leases = serializers.IntegerField()
    approved_leases = serializers.IntegerField()
    expiring_leases = serializers.IntegerField()
    terminated_leases = serializers.IntegerField()
    expired_leases = serializers.IntegerField()
    renewed_leases = serializers.IntegerField()
    expiring_within_days = serializers.IntegerField()


class MaintenanceReportSerializer(serializers.Serializer):
    open_tickets = serializers.IntegerField()
    assigned_tickets = serializers.IntegerField()
    in_progress_tickets = serializers.IntegerField()
    resolved_tickets = serializers.IntegerField()
    closed_tickets = serializers.IntegerField()
    cancelled_tickets = serializers.IntegerField()
