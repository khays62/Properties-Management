# Render Deployment Guide

This directory prepares OmniProperties for deployment on Render. No services are
created by committing these files. Review Render's plan pricing and provide the
external credentials before creating or syncing the Blueprint.

## Architecture

```text
Browser
  ├── Render Static Site (React/Vite)
  │     └── VITE_API_BASE_URL
  └── HTTPS API requests
        └── Render Web Service (Django + Gunicorn + WhiteNoise)
              ├── Render PostgreSQL (private network)
              ├── S3-compatible object storage (private, signed media URLs)
              └── Resend SMTP
```

Guides:

- [Backend deployment](./render-backend.md)
- [Frontend deployment](./render-frontend.md)
- [Environment variables](./environment-variables.md)
- [Production checklist](./production-checklist.md)

The root [`render.yaml`](../../render.yaml) defines the database, API service,
and static site. Review it and replace the example sender domain before use.

## Service order

1. Prepare a verified Resend sender and rotate any SMTP credential previously
   exposed outside the secret manager.
2. Create an S3-compatible private bucket and scoped credentials; migrate any
   existing uploaded files before directing users to the production app.
3. Review the Render plan and database disk size in `render.yaml`.
4. Create/sync the Blueprint and enter the prompted secrets in Render.
5. Confirm the PostgreSQL service is ready. The API pre-deploy command applies
   committed migrations before each deploy.
6. Confirm the API health endpoint, then verify the static site can log in and
   load authorized media.
7. Configure custom domains only after updating the API host, frontend URL,
   CORS origins, CSRF origins, and DNS together.

## Important limitations

- The Blueprint uses fixed default `onrender.com` service names. If service
  names or custom domains change, update all cross-origin settings.
- Render's filesystem is ephemeral. Uploaded media must use the configured
  S3-compatible storage; do not use a Render disk as the app's media URL
  without also designing a secure delivery path.
- The frontend currently stores JWTs in `localStorage`. HTTPS is required, but
  this remains an XSS exposure and should be considered in the threat model.
- `sync: false` secrets are prompted during initial Blueprint creation only.
  Later secret changes/rotations must be made in the Render dashboard.
- The configured paid compute plans incur charges after services are created.
  Check current pricing before creating the Blueprint.
