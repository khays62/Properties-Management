from pathlib import Path
import os

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / ".env")


def _get_bool_setting(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default

    normalized_value = value.strip().lower()
    if normalized_value in {"1", "true", "yes", "on"}:
        return True
    if normalized_value in {"0", "false", "no", "off"}:
        return False
    raise ImproperlyConfigured(f"{name} must be a boolean value.")


def _get_path_setting(name: str, default: Path) -> Path:
    path = Path(os.getenv(name, str(default)))
    return path if path.is_absolute() else BASE_DIR / path


SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "").strip()
if not SECRET_KEY:
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be configured.")

DEBUG = _get_bool_setting("DJANGO_DEBUG")
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "").split(",")
    if host.strip()
]
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = _get_bool_setting("CORS_ALLOW_CREDENTIALS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "django_filters",
    "rest_framework",
    "rest_framework_simplejwt",
    "drf_spectacular",
    "apps.accounts.apps.AccountsConfig",
    "apps.properties.apps.PropertiesConfig",
    "apps.listings.apps.ListingsConfig",
    "apps.applications.apps.ApplicationsConfig",
    "apps.leases.apps.LeasesConfig",
    "apps.finance.apps.FinanceConfig",
    "apps.maintenance.apps.MaintenanceConfig",
    "apps.notifications.apps.NotificationsConfig",
    "apps.audit.apps.AuditConfig",
    "apps.reports.apps.ReportsConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

ASGI_APPLICATION = "config.asgi.application"
WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("POSTGRES_DB", ""),
        "USER": os.getenv("POSTGRES_USER", ""),
        "PASSWORD": os.getenv("POSTGRES_PASSWORD", ""),
        "HOST": os.getenv("POSTGRES_HOST", ""),
        "PORT": os.getenv("POSTGRES_PORT", ""),
    }
}
database_url = os.getenv("DATABASE_URL", "").strip()
if database_url:
    try:
        import dj_database_url
    except ImportError as exc:
        raise ImproperlyConfigured(
            "dj-database-url is required when DATABASE_URL is configured."
        ) from exc

    DATABASES["default"] = dj_database_url.parse(
        database_url,
        conn_max_age=600,
        conn_health_checks=True,
    )
    if DATABASES["default"]["ENGINE"] != "django.db.backends.postgresql":
        raise ImproperlyConfigured("Only PostgreSQL DATABASE_URL values are supported.")

missing_database_settings = [
    setting
    for setting in ("NAME", "USER", "HOST", "PORT")
    if not DATABASES["default"][setting]
]
if missing_database_settings:
    missing_environment_variables = ", ".join(
        f"POSTGRES_{setting}" for setting in missing_database_settings
    )
    raise ImproperlyConfigured(
        "Missing required PostgreSQL environment variables: "
        f"{missing_environment_variables}."
    )

LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("TIME_ZONE", "Africa/Mogadishu")
USE_I18N = True
USE_TZ = True

STATIC_URL = os.getenv("STATIC_URL", "/static/")
STATIC_ROOT = _get_path_setting("STATIC_ROOT", BASE_DIR / "staticfiles")
MEDIA_URL = os.getenv("MEDIA_URL", "/media/")
MEDIA_ROOT = _get_path_setting("MEDIA_ROOT", BASE_DIR / "media")

MEDIA_STORAGE_BACKEND = os.getenv(
    "MEDIA_STORAGE_BACKEND",
    "filesystem",
).strip().lower()
if MEDIA_STORAGE_BACKEND not in {"filesystem", "s3"}:
    raise ImproperlyConfigured(
        "MEDIA_STORAGE_BACKEND must be either 'filesystem' or 's3'."
    )

STORAGES = {
    "default": {
        "BACKEND": "django.core.files.storage.FileSystemStorage",
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

if MEDIA_STORAGE_BACKEND == "s3":
    s3_storage_settings = {
        "bucket_name": os.getenv("AWS_STORAGE_BUCKET_NAME", "").strip(),
        "region_name": os.getenv("AWS_S3_REGION_NAME", "").strip(),
        "access_key": os.getenv("AWS_ACCESS_KEY_ID", "").strip(),
        "secret_key": os.getenv("AWS_SECRET_ACCESS_KEY", "").strip(),
    }
    missing_s3_settings = [
        name for name, value in s3_storage_settings.items() if not value
    ]
    if missing_s3_settings:
        raise ImproperlyConfigured(
            "S3 media storage requires AWS_STORAGE_BUCKET_NAME, "
            "AWS_S3_REGION_NAME, AWS_ACCESS_KEY_ID, and "
            "AWS_SECRET_ACCESS_KEY."
        )

    try:
        s3_querystring_expire = int(os.getenv("AWS_QUERYSTRING_EXPIRE", "300"))
    except ValueError as exc:
        raise ImproperlyConfigured(
            "AWS_QUERYSTRING_EXPIRE must be a positive integer."
        ) from exc
    if s3_querystring_expire <= 0:
        raise ImproperlyConfigured(
            "AWS_QUERYSTRING_EXPIRE must be a positive integer."
        )

    INSTALLED_APPS.append("storages")
    s3_storage_settings.update(
        {
            "endpoint_url": os.getenv("AWS_S3_ENDPOINT_URL", "").strip() or None,
            "querystring_auth": True,
            "querystring_expire": s3_querystring_expire,
            "file_overwrite": False,
        }
    )
    STORAGES["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": s3_storage_settings,
    }

EMAIL_BACKEND = os.getenv(
    "EMAIL_BACKEND",
    "django.core.mail.backends.console.EmailBackend",
)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USE_TLS = _get_bool_setting("EMAIL_USE_TLS", True)
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
DEFAULT_FROM_EMAIL = os.getenv(
    "DEFAULT_FROM_EMAIL",
    "no-reply@omniproperties.local",
)
FRONTEND_BASE_URL = os.getenv(
    "FRONTEND_BASE_URL",
    "http://localhost:5173",
).rstrip("/")
PASSWORD_RESET_TIMEOUT = int(os.getenv("PASSWORD_RESET_TIMEOUT", "86400"))

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CSRF_TRUSTED_ORIGINS", "").split(",")
    if origin.strip()
]

SECURE_SSL_REDIRECT = _get_bool_setting("SECURE_SSL_REDIRECT")
SESSION_COOKIE_SECURE = _get_bool_setting("SESSION_COOKIE_SECURE")
CSRF_COOKIE_SECURE = _get_bool_setting("CSRF_COOKIE_SECURE")
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = _get_bool_setting(
    "SECURE_HSTS_INCLUDE_SUBDOMAINS"
)
SECURE_HSTS_PRELOAD = _get_bool_setting("SECURE_HSTS_PRELOAD")
SECURE_CONTENT_TYPE_NOSNIFF = _get_bool_setting(
    "SECURE_CONTENT_TYPE_NOSNIFF",
    True,
)
SECURE_REFERRER_POLICY = os.getenv(
    "SECURE_REFERRER_POLICY",
    "strict-origin-when-cross-origin",
)

proxy_ssl_header = os.getenv("SECURE_PROXY_SSL_HEADER", "").strip()
if proxy_ssl_header:
    proxy_ssl_header_parts = [
        part.strip() for part in proxy_ssl_header.split(",", maxsplit=1)
    ]
    if len(proxy_ssl_header_parts) != 2 or not all(proxy_ssl_header_parts):
        raise ImproperlyConfigured(
            "SECURE_PROXY_SSL_HEADER must contain a header and value "
            "separated by a comma."
        )
    SECURE_PROXY_SSL_HEADER = tuple(proxy_ssl_header_parts)
else:
    SECURE_PROXY_SSL_HEADER = None

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "common.pagination.DefaultPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
}

AUTH_USER_MODEL = "accounts.User"

SPECTACULAR_SETTINGS = {
    "TITLE": "OmniProperties API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
