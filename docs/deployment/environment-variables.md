# Render Environment Variables

Set secrets only in Render's environment settings. The repository's
`render.yaml` generates the Django secret and prompts for variables marked
`sync: false` during initial Blueprint creation. Later secret updates are
managed in the Render dashboard.

| Variable | Service | Required value / purpose |
| --- | --- | --- |
| `DJANGO_SETTINGS_MODULE` | API | `config.settings.production` |
| `DJANGO_SECRET_KEY` | API | Render-generated secret; keep private |
| `DJANGO_DEBUG` | API | `False` |
| `DJANGO_ALLOWED_HOSTS` | API | Comma-separated API hostnames, without schemes |
| `CORS_ALLOWED_ORIGINS` | API | Exact frontend origin(s), including `https://` |
| `CORS_ALLOW_CREDENTIALS` | API | `False` for the current bearer-token API |
| `CSRF_TRUSTED_ORIGINS` | API | Trusted HTTPS origins, comma-separated |
| `DATABASE_URL` | API | Render Postgres private `connectionString`; PostgreSQL only |
| `TIME_ZONE` | API | `Africa/Mogadishu`; database timestamps remain UTC |
| `EMAIL_BACKEND` | API | `django.core.mail.backends.smtp.EmailBackend` |
| `EMAIL_HOST` | API | `smtp.resend.com` |
| `EMAIL_PORT` | API | `587` |
| `EMAIL_USE_TLS` | API | `True` |
| `EMAIL_HOST_USER` | API | `resend` |
| `EMAIL_HOST_PASSWORD` | API | Resend SMTP credential; secret |
| `DEFAULT_FROM_EMAIL` | API | Sender address on a verified domain |
| `FRONTEND_BASE_URL` | API | Frontend HTTPS origin used in email links |
| `PASSWORD_RESET_TIMEOUT` | API | Token validity in seconds; Blueprint uses `86400` |
| `SECURE_SSL_REDIRECT` | API | `True` |
| `SESSION_COOKIE_SECURE` | API | `True` |
| `CSRF_COOKIE_SECURE` | API | `True` |
| `SECURE_HSTS_SECONDS` | API | At least `31536000` |
| `SECURE_HSTS_INCLUDE_SUBDOMAINS` | API | `False` until all subdomains are HTTPS-ready |
| `SECURE_HSTS_PRELOAD` | API | `False` unless preload requirements are reviewed |
| `SECURE_CONTENT_TYPE_NOSNIFF` | API | `True` |
| `SECURE_REFERRER_POLICY` | API | `strict-origin-when-cross-origin` |
| `SECURE_PROXY_SSL_HEADER` | API | `HTTP_X_FORWARDED_PROTO,https` |
| `MEDIA_STORAGE_BACKEND` | API | `s3` in production |
| `AWS_STORAGE_BUCKET_NAME` | API | Private media bucket name; not a secret |
| `AWS_S3_REGION_NAME` | API | Bucket region |
| `AWS_ACCESS_KEY_ID` | API | Least-privilege object-storage access key; secret |
| `AWS_SECRET_ACCESS_KEY` | API | Object-storage secret; secret |
| `AWS_S3_ENDPOINT_URL` | API, optional | Custom endpoint for an S3-compatible provider |
| `AWS_QUERYSTRING_EXPIRE` | API, optional | Signed URL lifetime in seconds; defaults to `300` |
| `VITE_API_BASE_URL` | Frontend | `https://<API-host>/api/v1/`; public, build-time value |

For local development, copy `backend/.env.example` to `backend/.env` and
`frontend/.env.example` to `frontend/.env.local`. Keep production values out of
both files and out of Git.

`DATABASE_URL` takes precedence over the local split PostgreSQL variables. If
it is absent, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`,
`POSTGRES_HOST`, and `POSTGRES_PORT` are required. No SQLite fallback exists.

When adding custom domains, update `DJANGO_ALLOWED_HOSTS`, CORS/CSRF origins,
`FRONTEND_BASE_URL`, and the frontend's `VITE_API_BASE_URL` together, then
rebuild the static site.
