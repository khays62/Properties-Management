# Production Deployment Checklist

## Before creating Render services

- [ ] Review the selected paid web and PostgreSQL plans, database storage, and
      expected monthly cost.
- [ ] Rotate any SMTP credential previously exposed outside the secret manager.
- [ ] Verify Resend sender domain, SPF, DKIM, and DMARC; confirm the chosen
      `DEFAULT_FROM_EMAIL` is allowed.
- [ ] Create a private S3-compatible media bucket and least-privilege access
      credentials.
- [ ] Plan and verify migration of existing uploaded files and PostgreSQL data.
- [ ] Back up source data and test database restore and media recovery.
- [ ] Confirm migrations are committed and review them for safe production use.
- [ ] Review service and domain names in `render.yaml`; replace example sender
      domain and update origins if using custom domains.

## Render configuration

- [ ] Create/sync the Blueprint only after reviewing its services and cost.
- [ ] Enter SMTP and object-storage secrets in Render, never in the repository.
- [ ] Confirm API and database share the Oregon region and the database is
      private.
- [ ] Confirm Render's PostgreSQL backup/retention settings meet recovery
      objectives.
- [ ] Keep `DEBUG=False`, explicit `ALLOWED_HOSTS`, exact CORS/CSRF origins,
      HTTPS redirect, secure cookies, HSTS, and proxy header enabled.
- [ ] Check that `VITE_API_BASE_URL` is set before building the static site.

## After deploy

- [ ] API health check succeeds and reports healthy database connectivity.
- [ ] Migrations complete without errors.
- [ ] Admin static files load through WhiteNoise.
- [ ] SPA deep links work on refresh.
- [ ] Login, refresh, logout, and an authenticated API request work over HTTPS.
- [ ] CORS and CSRF origins match the deployed hostnames exactly.
- [ ] A test invitation arrives from the verified sender.
- [ ] Authorized media is delivered through expiring signed URLs; unauthenticated
      users cannot read private bucket objects.
- [ ] Render logs and metrics are reviewed; alerts and a rollback procedure are
      established.

## Security and operations notes

- Render handles public TLS termination and reverse proxying; a separate Nginx
  service is not required. Django trusts the configured
  `X-Forwarded-Proto: https` header from Render.
- The frontend currently stores JWTs in `localStorage`; evaluate the XSS risk
  and CSP/security posture as part of ongoing production hardening.
- Do not use Render's ephemeral filesystem for uploaded files. WhiteNoise is
  only for Django static files; user media uses private S3-compatible storage.
- Confirm backup retention, restore testing, data retention, SMTP monitoring,
  object-storage lifecycle, and incident-response ownership before onboarding
  real tenants.
