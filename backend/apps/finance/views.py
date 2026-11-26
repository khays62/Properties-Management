from django.db.models import QuerySet
from rest_framework import mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.request import Request
from rest_framework.response import Response

from apps.audit.services.audit_log_service import AuditContext

from .models import Deposit, Payment, Receipt, RentCharge, RentSchedule
from .permissions import CanManageFinance, CanManagePayments
from .selectors.deposit_selector import DepositSelector
from .selectors.payment_selector import PaymentSelector
from .selectors.receipt_selector import ReceiptSelector
from .selectors.rent_charge_selector import RentChargeSelector
from .serializers import (
    AllocatePaymentSerializer,
    DepositPaymentSerializer,
    DepositRefundSerializer,
    DepositSerializer,
    InvoiceSerializer,
    PaymentDetailSerializer,
    PaymentSerializer,
    ReceiptSerializer,
    RentChargeGenerateSerializer,
    RentChargeSerializer,
    RentScheduleSerializer,
)
from .services.deposit_service import DepositService
from .services.invoice_service import InvoiceService
from .services.payment_service import PaymentService
from .services.rent_charge_service import RentChargeService
from .services.rent_schedule_service import RentScheduleService


class DepositViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = DepositSerializer
    permission_classes = (CanManageFinance,)

    def get_queryset(self) -> QuerySet[Deposit]:
        return DepositSelector.get_deposits(
            user=self.request.user,
            status=self.request.query_params.get("status"),
            lease_id=self.request.query_params.get("lease"),
            tenant_id=self.request.query_params.get("tenant"),
            search=self.request.query_params.get("search"),
        )

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        serializer.instance = DepositService.create_deposit(
            lease=serializer.validated_data["lease"],
            created_by=self.request.user,
        )

    @action(detail=True, methods=["post"], url_path="record-payment")
    def record_payment(self, request: Request, pk: str | None = None) -> Response:
        input_serializer = DepositPaymentSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        deposit = DepositService.record_deposit_payment(
            self.get_object(),
            recorded_by=request.user,
            **input_serializer.validated_data,
        )
        return Response(self.get_serializer(deposit).data)

    @action(detail=True, methods=["post"], url_path="refund")
    def refund(self, request: Request, pk: str | None = None) -> Response:
        input_serializer = DepositRefundSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        deposit = DepositService.refund_deposit(
            self.get_object(),
            refunded_by=request.user,
            **input_serializer.validated_data,
        )
        return Response(self.get_serializer(deposit).data)

    @action(detail=True, methods=["post"], url_path="forfeit")
    def forfeit(self, request: Request, pk: str | None = None) -> Response:
        deposit = DepositService.forfeit_deposit(
            self.get_object(),
            forfeited_by=request.user,
        )
        return Response(self.get_serializer(deposit).data)


class RentScheduleViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = RentScheduleSerializer
    permission_classes = (CanManageFinance,)
    allow_tenant_read = False

    def get_queryset(self) -> QuerySet[RentSchedule]:
        return RentChargeSelector.get_schedules(user=self.request.user)

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        values = dict(serializer.validated_data)
        lease = values.pop("lease")
        serializer.instance = RentScheduleService.create_schedule(
            lease=lease,
            created_by=self.request.user,
            **values,
        )

    def perform_update(self, serializer: serializers.BaseSerializer) -> None:
        values = dict(serializer.validated_data)
        values.pop("lease", None)
        serializer.instance = RentScheduleService.update_schedule(
            serializer.instance,
            updated_by=self.request.user,
            due_day=values.get("due_day", serializer.instance.due_day),
            frequency=values.get("frequency", serializer.instance.frequency),
            is_active=values.get("is_active", serializer.instance.is_active),
        )


class RentChargeViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = RentChargeSerializer
    permission_classes = (CanManageFinance,)

    def get_queryset(self) -> QuerySet[RentCharge]:
        return RentChargeSelector.get_charges(
            user=self.request.user,
            status=self.request.query_params.get("status"),
            tenant_id=self.request.query_params.get("tenant"),
            lease_id=self.request.query_params.get("lease"),
            billing_month=self.request.query_params.get("billing_month"),
            billing_year=self.request.query_params.get("billing_year"),
            search=self.request.query_params.get("search"),
        ).select_related("invoice")

    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request: Request) -> Response:
        input_serializer = RentChargeGenerateSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        charges = RentChargeService.generate_monthly_charges(
            created_by=request.user,
            **input_serializer.validated_data,
        )
        return Response(
            RentChargeSerializer(
                charges,
                many=True,
                context=self.get_serializer_context(),
            ).data
        )

    @action(detail=True, methods=["post"], url_path="mark-overdue")
    def mark_overdue(self, request: Request, pk: str | None = None) -> Response:
        charge = RentChargeService.mark_overdue(
            self.get_object(),
            changed_by=request.user,
        )
        return Response(self.get_serializer(charge).data)

    @action(detail=True, methods=["post"], url_path="issue-invoice")
    def issue_invoice(self, request: Request, pk: str | None = None) -> Response:
        invoice = InvoiceService.issue_invoice(rent_charge=self.get_object())
        return Response(InvoiceSerializer(invoice).data)


class PaymentViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    permission_classes = (CanManagePayments,)

    def get_queryset(self) -> QuerySet[Payment]:
        return PaymentSelector.get_payments(
            user=self.request.user,
            status=self.request.query_params.get("status"),
            tenant_id=self.request.query_params.get("tenant"),
            payment_method=self.request.query_params.get("payment_method"),
            search=self.request.query_params.get("search"),
        )

    def get_serializer_class(self) -> type[serializers.BaseSerializer]:
        if self.action == "allocate":
            return AllocatePaymentSerializer
        if self.action == "create":
            return PaymentSerializer
        return PaymentDetailSerializer

    def perform_create(self, serializer: serializers.BaseSerializer) -> None:
        serializer.instance = PaymentService.create_payment(
            created_by=self.request.user,
            audit_context=AuditContext.from_request(self.request),
            **serializer.validated_data,
        )

    @action(detail=True, methods=["post"], url_path="allocate")
    def allocate(self, request: Request, pk: str | None = None) -> Response:
        input_serializer = AllocatePaymentSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        payment = PaymentService.allocate_payment(
            self.get_object(),
            allocated_by=request.user,
            **input_serializer.validated_data,
        )
        return Response(
            PaymentDetailSerializer(
                payment,
                context=self.get_serializer_context(),
            ).data
        )

    @action(detail=True, methods=["post"], url_path="reverse")
    def reverse(self, request: Request, pk: str | None = None) -> Response:
        payment = PaymentService.reverse_payment(
            self.get_object(),
            reversed_by=request.user,
            audit_context=AuditContext.from_request(request),
        )
        return Response(
            PaymentDetailSerializer(
                payment,
                context=self.get_serializer_context(),
            ).data
        )


class ReceiptViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = ReceiptSerializer
    permission_classes = (CanManagePayments,)

    def get_queryset(self) -> QuerySet[Receipt]:
        return ReceiptSelector.get_receipts(
            user=self.request.user,
            tenant_id=self.request.query_params.get("tenant"),
            payment_id=self.request.query_params.get("payment"),
            search=self.request.query_params.get("search"),
        )
