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
