from typing import Any

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework.exceptions import ValidationError

from apps.accounts.services.tenant_invitation_service import TenantInvitationService
from apps.applications.models import Applicant
from common.constants import TenantStatus, UserRole
from common.exceptions import ConflictErrorResponse
from apps.properties.services.validation import validate_model

from ..models import Tenant


class TenantService:
    @staticmethod
    def create_tenant(
        *,
        user=None,
        applicant: Applicant | None = None,
        allow_existing: bool = False,
        send_invitation: bool = True,
        **tenant_data: Any,
    ) -> Tenant:
        if (user is None) == (applicant is None):
            raise ValidationError(
                "Provide exactly one of an existing user or an approved applicant."
            )

        with transaction.atomic():
            if applicant is not None:
                user = TenantService._get_or_create_applicant_user(applicant)

            existing_tenant = Tenant.objects.filter(user=user).first()
            if existing_tenant is not None:
                if not allow_existing:
                    raise ConflictErrorResponse(
                        "A tenant profile already exists for this user."
                    )
                tenant = existing_tenant
            else:
                tenant = Tenant(
                    user=user,
                    status=TenantStatus.INACTIVE,
                    **tenant_data,
                )
                validate_model(tenant)
                tenant.save()

            if send_invitation:
                TenantInvitationService.send_password_setup_email(user)
        return tenant

    @staticmethod
    def _get_or_create_applicant_user(applicant: Applicant):
        User = get_user_model()
        email = applicant.email.strip().lower()
        matches = list(User.objects.filter(email__iexact=email).order_by("pk")[:2])
        if len(matches) > 1:
            raise ConflictErrorResponse(
                "More than one user account matches the applicant email."
            )
        if matches:
            return matches[0]

        try:
            with transaction.atomic():
                return User.objects.create_user(
                    email=email,
                    password=None,
                    first_name=applicant.first_name,
                    last_name=applicant.last_name,
                    phone_number=applicant.phone,
                    role=UserRole.TENANT,
                    is_active=True,
                )
        except IntegrityError:
            try:
                return User.objects.get(email__iexact=email)
            except User.DoesNotExist as exc:
                raise ConflictErrorResponse(
                    "The tenant account could not be created."
                ) from exc
