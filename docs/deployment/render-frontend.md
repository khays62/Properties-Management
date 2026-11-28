# Render Frontend Deployment

## Static Site

The `omniproperties-frontend` service in [`render.yaml`](../../render.yaml) is a
Render Static Site rooted at `frontend/`.

- Build command: `npm ci && npm run build`
- Publish directory: `dist`
- Build-time API URL: `VITE_API_BASE_URL`
- SPA fallback: rewrite all routes to `/index.html`

Vite embeds environment variables into the generated JavaScript at build time.
Set `VITE_API_BASE_URL` to the API's HTTPS origin plus `/api/v1/`, for example:

```text
https://omniproperties-api.onrender.com/api/v1/
```

Do not use the local `frontend/.env.local` file or deploy an old local `dist/`
directory. Render builds from source on every deploy.

## CORS and CSRF

The Blueprint sets the API's `CORS_ALLOWED_ORIGINS` to the frontend Render
origin and includes the frontend and API origins in `CSRF_TRUSTED_ORIGINS`.
If either hostname changes, update those values along with `FRONTEND_BASE_URL`,
`DJANGO_ALLOWED_HOSTS`, and `VITE_API_BASE_URL`.

JWT requests are sent using the frontend's existing bearer-token flow. The
current frontend stores access and refresh tokens in `localStorage`; enabling
HTTPS protects transport but does not prevent token theft from an XSS
vulnerability. No frontend authentication workflow is changed by this
deployment setup.

## Verification

After the first successful deploy:

1. Open a deep route such as `/login` directly and refresh; it should serve the
   SPA rather than a Render 404.
2. Confirm browser developer tools show API calls to the deployed HTTPS API,
   not `localhost` or `127.0.0.1`.
3. Confirm CORS permits the exact deployed frontend origin.
4. Test login, token refresh, logout, and one representative authenticated
   page.
5. Rebuild after changing `VITE_API_BASE_URL`; changing the service variable
   without a new build does not rewrite an already-published bundle.

For a custom domain, use the HTTPS hostname in `CORS_ALLOWED_ORIGINS`,
`CSRF_TRUSTED_ORIGINS`, and `FRONTEND_BASE_URL`, and update DNS and TLS in
Render.
