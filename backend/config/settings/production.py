from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403


if DEBUG:
    raise ImproperlyConfigured(
        "DJANGO_DEBUG must be False when using production settings."
    )

if EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend":
    raise ImproperlyConfigured(
        "A production email backend must be configured for tenant password setup."
    )

if (
    EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend"
    and not EMAIL_HOST
):
    raise ImproperlyConfigured(
        "EMAIL_HOST must be configured for the production SMTP backend."
    )

if not FRONTEND_BASE_URL.startswith("https://"):
    raise ImproperlyConfigured(
        "FRONTEND_BASE_URL must use HTTPS in production."
    )
