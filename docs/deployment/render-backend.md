# Render Backend Deployment

## Service definition

The `omniproperties-api` service in [`render.yaml`](../../render.yaml) is a
Python web service rooted at `backend/`. It runs Django under Gunicorn and uses
the Render private network to connect to the managed PostgreSQL database.

- Build: install `requirements/production.txt`, then run `collectstatic`.
- Pre-deploy: apply committed database migrations.
- Start: run `gunicorn config.wsgi:application` on Render's `$PORT`.
- Health check: `/api/v1/health/` (checks database availability).
- Region: Oregon, shared with the database.

The selected plan is paid; review Render's current pricing and service limits
before creating it. `preDeployCommand` requires a paid web-service plan.

## Database

The Blueprint exposes Render Postgres's private `connectionString` as
`DATABASE_URL`. Django parses this URL using `dj-database-url`; only PostgreSQL
URLs are accepted. Local development may continue using the split
`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST`, and
`POSTGRES_PORT` variables.

In the Render dashboard:

1. Confirm the database and API service use the same region.
2. Keep the database private (`ipAllowList: []`); connect through the API
   service's private network.
3. Review database plan, storage capacity, backups, retention, and recovery
   options for your data-retention requirements.
4. Before importing existing data, create a backup, test a restore, and plan
   the migration window. Never point production at the local development DB.
5. Keep schema changes in committed Django migrations. The pre-deploy command
   runs `migrate --noinput`; do not run migrations independently during a live
   deployment.

## Static files

`collectstatic` gathers Django admin and app assets into `STATIC_ROOT`.
WhiteNoise serves those static files from the Django web service with
compressed, manifest-versioned assets. `WhiteNoiseMiddleware` is installed
immediately after Django's `SecurityMiddleware` in production settings.

Do not upload `frontend/dist` from a local machine. Render builds the frontend
from source, and Django static files are built separately by the API service.

## User-uploaded media

Production settings require S3-compatible storage, configured through
`django-storages` and boto3. The default configuration uses private objects and
short-lived signed URLs (300 seconds). Provide bucket, region, access key, and
secret key values in Render; for an S3-compatible provider such as R2, also set
`AWS_S3_ENDPOINT_URL` in the dashboard.

Use a private bucket with least-privilege credentials limited to the required
bucket and object operations. Do not make tenant documents, application
attachments, or maintenance files public. Before cutover, copy existing uploads
to the bucket and verify that application authorization controls who receives
the signed URLs. Back up the bucket independently of the database.

The `render.yaml` intentionally does not create an object-storage service or
contain storage credentials. Object storage must be provisioned separately.

## Email

The service uses Django's SMTP backend with Resend. Set
`EMAIL_HOST_PASSWORD` in Render's secret environment settings, and replace
`DEFAULT_FROM_EMAIL` with an address on a verified sender domain. Confirm SPF,
DKIM, and DMARC according to Resend's current domain instructions. Keep
credentials out of Git and rotate credentials if they were previously exposed.

## Render proxy and the Nginx equivalent

Render terminates TLS and proxies HTTP to the service; a separate Nginx
container/config is not required on Render. Production settings trust only
`HTTP_X_FORWARDED_PROTO=https`, enable Django's HTTPS redirect and secure
cookies, and set one-year HSTS. Keep the API's Render hostname in
`DJANGO_ALLOWED_HOSTS`.

On a self-managed Linux VPS, Nginx would instead terminate TLS, forward requests
to Gunicorn, set the forwarded-protocol header, serve or proxy static assets,
and apply request-size/time limits. Do not copy Render's proxy assumptions to a
VPS without configuring and testing the actual Nginx headers and TLS setup.

## Manual deployment checks

After deployment, verify:

1. `/api/v1/health/` returns a healthy response.
2. Django admin and API docs load required static assets.
3. The frontend authenticates against the deployed API.
4. An authorized media request returns a short-lived URL and private objects
   are not publicly readable.
5. A test invitation is sent from the verified domain and arrives as expected.
6. Render logs contain no startup, migration, database, SMTP, or storage errors.
