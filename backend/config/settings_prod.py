"""
Park Naija AI — Production Settings Extension
------------------------------------------------
This file is imported at the bottom of config/settings.py
when DJANGO_ENV=production is set.

Add to the END of config/settings.py:

    import os
    if os.environ.get("DJANGO_ENV") == "production":
        from config.settings_prod import *  # noqa

Or just paste these directly into settings.py for Railway deployment.
"""

import os
import dj_database_url

# ── Database — use DATABASE_URL from Railway ──────────────────
DATABASE_URL = os.environ.get("DATABASE_URL")
if DATABASE_URL:
    DATABASES = {
        "default": dj_database_url.config(
            default=DATABASE_URL,
            conn_max_age=600,
            conn_health_checks=True,
        )
    }

# ── Security ──────────────────────────────────────────────────
DEBUG = False
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT      = True
SESSION_COOKIE_SECURE    = True
CSRF_COOKIE_SECURE       = True
SECURE_HSTS_SECONDS      = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True

# ── Static files — whitenoise ─────────────────────────────────
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",   # serve static files
] + [m for m in MIDDLEWARE if m not in (  # type: ignore # noqa
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
)]

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ── CORS — restrict to known frontend ─────────────────────────
# Set CORS_ALLOWED_ORIGINS in Railway env vars, not here
CORS_ALLOW_ALL_ORIGINS = False

# ── Logging ───────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {"format": "%(levelname)s %(name)s: %(message)s"},
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
        },
    },
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {
        "apps.whatsapp": {"level": "INFO", "propagate": True},
        "django.request":  {"level": "WARNING", "propagate": True},
    },
}
