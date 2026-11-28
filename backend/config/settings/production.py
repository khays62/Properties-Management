from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403


if DEBUG:
    raise ImproperlyConfigured(
        "DJANGO_DEBUG must be False when using production settings."
    )

if not ALLOWED_HOSTS or "*" in ALLOWED_HOSTS:
    raise ImproperlyConfigured(
        "DJANGO_ALLOWED_HOSTS must contain explicit production hostnames."
    )

if not CORS_ALLOWED_ORIGINS:
    raise ImproperlyConfigured(
        "CORS_ALLOWED_ORIGINS must contain the production frontend origin."
    )

if not CSRF_TRUSTED_ORIGINS:
    raise ImproperlyConfigured(
        "CSRF_TRUSTED_ORIGINS must contain trusted HTTPS origins."
    )

if EMAIL_BACKEND == "django.core.mail.backends.console.EmailBackend":
    raise ImproperlyConfigured(
        "A production email backend must be configured for tenant password setup."
    )

if EMAIL_BACKEND != "django.core.mail.backends.smtp.EmailBackend":
    raise ImproperlyConfigured(
        "Production email must use the Django SMTP backend."
    )

if not EMAIL_HOST or not EMAIL_HOST_USER or not EMAIL_HOST_PASSWORD:
    raise ImproperlyConfigured(
        "EMAIL_HOST, EMAIL_HOST_USER, and EMAIL_HOST_PASSWORD are required "
        "for production SMTP."
    )

if not DEFAULT_FROM_EMAIL or "@" not in DEFAULT_FROM_EMAIL:
    raise ImproperlyConfigured(
        "DEFAULT_FROM_EMAIL must be a valid production sender address."
    )

if not FRONTEND_BASE_URL.startswith("https://"):
    raise ImproperlyConfigured(
        "FRONTEND_BASE_URL must use HTTPS in production."
    )

if (
    not SECURE_SSL_REDIRECT
    or not SESSION_COOKIE_SECURE
    or not CSRF_COOKIE_SECURE
    or SECURE_HSTS_SECONDS < 31_536_000
    or SECURE_PROXY_SSL_HEADER != ("HTTP_X_FORWARDED_PROTO", "https")
):
    raise ImproperlyConfigured(
        "Production requires HTTPS redirect, secure cookies, one-year HSTS, "
        "and the trusted HTTPS proxy header."
    )

if MEDIA_STORAGE_BACKEND != "s3":
    raise ImproperlyConfigured(
        "Production requires durable S3-compatible media storage."
    )

MIDDLEWARE.insert(
    1,
    "whitenoise.middleware.WhiteNoiseMiddleware",
)
STORAGES["staticfiles"] = {
    "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
}
