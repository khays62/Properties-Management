# 06 - API Contract

## Applications

`POST /api/v1/applications/` accepts anonymous submissions:

```json
{
  "listing": "<published-listing-uuid>",
  "applicant": {
    "first_name": "Amina",
    "last_name": "Applicant",
    "email": "amina@example.com",
    "phone": "+252610000000",
    "employment_status": "EMPLOYED",
    "employer_name": "Example Employer",
    "monthly_income": "1500.00",
    "current_address": "Mogadishu"
  },
  "move_in_date": "2026-12-01",
  "notes": "Optional"
}
```

Application list, detail, and review actions require an owner or property manager scoped to the listing's property. List filters are `status`, `listing`, `city`, `property`, `date` (submission date, `YYYY-MM-DD`), and `search`.

Application actions:

- `POST /api/v1/applications/{id}/review/`
- `POST /api/v1/applications/{id}/start-screening/`
- `POST /api/v1/applications/{id}/approve/`
- `POST /api/v1/applications/{id}/reject/` with `{"rejection_reason": "..."}`
- `POST /api/v1/applications/{id}/withdraw/`

`GET /api/v1/applicants/` and applicant detail/update endpoints are restricted to owners and assigned property managers.

## Screenings

Screening list and detail endpoints require an owner or property manager scoped to the related property. List filters are `status` and `reviewed_by`.

- `POST /api/v1/screenings/{id}/start/`
- `POST /api/v1/screenings/{id}/pass/`
- `POST /api/v1/screenings/{id}/fail/`

Pass/fail requests may include `score` (0-100), `notes`, and the `income_verified`, `employment_verified`, and `references_checked` flags. Applicants cannot access screening records or internal review data.

## Leases and tenants

Lease creation requires an approved application with a passed screening and is restricted to the owner or assigned property manager for the related property. A newly provisioned tenant account receives a one-time password setup link. `POST /api/v1/auth/tenant-password-setup/` accepts `uid`, `token`, and `new_password`.

Lease list filters are `status`, `tenant`, `property`, `unit`, `start_date`, `end_date`, and `search`. Owners and assigned property managers see leases for their properties; tenant users can only read their own leases.

Lease workflow actions:

- `POST /api/v1/leases/{id}/submit-for-approval/`
- `POST /api/v1/leases/{id}/approve/`
- `POST /api/v1/leases/{id}/activate/`
- `POST /api/v1/leases/{id}/renew/` with `{"new_end_date": "YYYY-MM-DD"}`
- `POST /api/v1/leases/{id}/terminate/`
- `POST /api/v1/leases/{id}/expire/`

Renewal alerts are available at `/api/v1/renewal-alerts/`; list filters are `status`, `lease`, and `property`. Tenants can read their own alerts, while owners and assigned property managers can manage alerts for their properties.

- `POST /api/v1/renewal-alerts/{id}/mark-read/`
- `POST /api/v1/renewal-alerts/{id}/resolve/`

`/api/v1/tenants/` is restricted to owners and assigned property managers and supports `status` and `search` filters.
