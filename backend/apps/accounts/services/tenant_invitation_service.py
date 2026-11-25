from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework.exceptions import ValidationError

from common.constants import UserRole


class TenantInvitationService:
    @staticmethod
    def send_password_setup_email(user) -> bool:
        if user.role != UserRole.TENANT:
            return False
        if not user.is_active or user.has_usable_password():
            return False

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        query = urlencode({"uid": uid, "token": token})
        setup_url = f"{settings.FRONTEND_BASE_URL}/set-password/?{query}"
        message = (
            "A tenant account has been created for you.\n\n"
            "Set your password using this secure link:\n"
            f"{setup_url}\n\n"
            f"This link expires in {settings.PASSWORD_RESET_TIMEOUT // 3600} hours. "
            "If you did not expect this message, you can ignore it."
        )
        sent = send_mail(
            subject="Set up your OmniProperties tenant account",
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        if sent != 1:
            raise RuntimeError("Tenant password setup email was not sent.")
        return True

    @staticmethod
    def set_password(*, uid: str, token: str, new_password: str) -> None:
        User = get_user_model()
        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, UnicodeDecodeError, User.DoesNotExist) as exc:
            raise ValidationError(
                {"token": "This password setup link is invalid or expired."}
            ) from exc

        if (
            user.role != UserRole.TENANT
            or not user.is_active
            or user.has_usable_password()
            or not default_token_generator.check_token(user, token)
        ):
            raise ValidationError(
                {"token": "This password setup link is invalid or expired."}
            )

        try:
            validate_password(new_password, user=user)
        except DjangoValidationError as exc:
            raise ValidationError({"new_password": exc.messages}) from exc

        user.set_password(new_password)
        user.save(update_fields=["password", "updated_at"])
