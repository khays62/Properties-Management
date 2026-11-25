from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403


if DEBUG:
    raise ImproperlyConfigured(
        "DJANGO_DEBUG must be False when using production settings."
    )
