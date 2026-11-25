from rest_framework.permissions import BasePermission
from rest_framework.request import Request
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.leases.models import Tenant
from common.constants import UserRole
from common.permissions import has_role

from ..models import Deposit, Payment, Receipt, RentCharge, RentSchedule
from ..selectors.finance_access_selector import FinanceAccessSelector
from ..selectors.payment_selector import PaymentSelector


MANAGER_ROLES = (
    UserRole.ACCOUNTANT,
    UserRole.OWNER,
    UserRole.PROPERTY_MANAGER,
)
READ_ACTIONS = ("list", "retrieve")


class CanManageFinance(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        if has_role(request.user, MANAGER_ROLES):
            return True
        return (
            bool(getattr(request.user, "is_authenticated", False))
            and has_role(request.user, (UserRole.TENANT,))
            and getattr(view, "allow_tenant_read", True)
            and getattr(view, "action", None) in READ_ACTIONS
            and Tenant.objects.filter(user=request.user).exists()
        )

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Deposit | RentSchedule | RentCharge,
    ) -> bool:
        if has_role(request.user, (UserRole.ACCOUNTANT,)):
            return True
        if has_role(request.user, (UserRole.TENANT,)):
            return (
                getattr(view, "action", None) in READ_ACTIONS
                and obj.lease.tenant.user_id == request.user.pk
            )
        return FinanceAccessSelector.user_can_manage_lease(
            user=request.user,
            lease=obj.lease,
        )


class CanManagePayments(BasePermission):
    def has_permission(self, request: Request, view: APIView) -> bool:
        if has_role(request.user, MANAGER_ROLES):
            return True
        return (
            bool(getattr(request.user, "is_authenticated", False))
            and has_role(request.user, (UserRole.TENANT,))
            and getattr(view, "action", None) in READ_ACTIONS
            and Tenant.objects.filter(user=request.user).exists()
        )

    def has_object_permission(
        self,
        request: Request,
        view: APIView,
        obj: Payment | Receipt,
    ) -> bool:
        if has_role(request.user, (UserRole.ACCOUNTANT,)):
            return True
        payment = obj.payment if isinstance(obj, Receipt) else obj
        if has_role(request.user, (UserRole.TENANT,)):
            return (
                getattr(view, "action", None) in READ_ACTIONS
                and payment.tenant.user_id == request.user.pk
            )
        user: User = request.user
        return PaymentSelector.user_can_manage_tenant(
            user=user,
            tenant_id=payment.tenant_id,
        )
