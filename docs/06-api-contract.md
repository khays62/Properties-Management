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

## Finance

Finance write actions are restricted to accountants, owners, and assigned property managers. Tenants may only list and retrieve their own deposits, rent charges, payments, and receipts.

- `POST /api/v1/deposits/` with `{"lease": "<lease-uuid>"}` creates the lease's deposit record.
- `POST /api/v1/deposits/{id}/record-payment/` accepts `amount`, `reference_number`, `payment_method`, and optional `payment_date`.
- `POST /api/v1/deposits/{id}/refund/` accepts an optional `amount`; omitting it refunds the remaining paid amount.
- `POST /api/v1/deposits/{id}/forfeit/`

Deposit filters are `status` and `lease` (also supports `tenant` and `search`).

`POST /api/v1/rent-schedules/` creates a monthly schedule for an active lease; its due day must match the lease. Schedules are listed at `/api/v1/rent-schedules/`.

- `POST /api/v1/rent-charges/generate/` accepts `billing_month` and `billing_year` and generates charges for accessible active schedules.
- `POST /api/v1/rent-charges/{id}/mark-overdue/`
- `POST /api/v1/rent-charges/{id}/issue-invoice/` idempotently issues or returns the invoice for a charge.

Rent charge filters are `status`, `tenant`, `lease`, `billing_month`, `billing_year`, and `search`.

`POST /api/v1/payments/` records a pending payment with `tenant`, `amount`, `payment_date`, `reference_number`, and `payment_method`.
`POST /api/v1/payments/{id}/allocate/` accepts `{"allocations": [{"rent_charge": "<charge-uuid>", "amount_allocated": "100.00"}]}`. Allocations must equal the payment amount; successful allocation completes the payment and generates its receipt.

- `POST /api/v1/payments/{id}/reverse/`

Payment filters are `status`, `tenant`, `payment_method`, and `search`. Receipts are read-only at `/api/v1/receipts/`; filters include `tenant`, `payment`, and `search`.

The rent-charge response includes the optional `invoice_number`. The current API does not expose an invoice list or invoice detail/retrieve endpoint; clients must not infer invoice records or their issue dates from rent charges.

Suggested future additions: a paginated, role-scoped `GET /api/v1/invoices/` with supported search/filter parameters and `GET /api/v1/invoices/{id}/` returning invoice fields plus its rent-charge reference. Until then, invoice list/detail screens are not supported.

## Maintenance

Tenants can create tickets at `POST /api/v1/maintenance-tickets/` with `unit`, `title`, `description`, `category`, and optional `priority`. Owners and assigned property managers can also create tickets for a tenant with a lease for the selected unit. Ticket filters are `status`, `priority`, `category`, `tenant`, `property`, `unit`, `assigned_to`, and `search`. Owners and assigned property managers see tickets for their properties; tenants can access only their own.

Ticket workflow actions:

- `POST /api/v1/maintenance-tickets/{id}/assign/` with `{"assigned_to": "<property-manager-uuid>"}` and optional `notes`
- `POST /api/v1/maintenance-tickets/{id}/start/` with optional `notes`
- `POST /api/v1/maintenance-tickets/{id}/resolve/` with `{"resolution_notes": "..."}`
- `POST /api/v1/maintenance-tickets/{id}/close/` with optional `notes`
- `POST /api/v1/maintenance-tickets/{id}/cancel/` with optional `notes`

Ticket detail includes its activity history and attachments. Attachments can be uploaded to `/api/v1/maintenance-attachments/` as multipart form data with `ticket` and `file`; allowed file extensions are JPG, JPEG, PNG, and PDF, with a 5 MB maximum. Activities are read-only at `/api/v1/maintenance-activities/` and can be filtered by `ticket`.

## Notifications

`/api/v1/notifications/` lists only the authenticated user's notifications. List filters are `is_read`, `type`, and `search`; detail access is also user-scoped.

- `POST /api/v1/notifications/{id}/mark-read/`
- `POST /api/v1/notifications/mark-all-read/`

The mark-all-read response includes `updated_count`.

## Audit

`/api/v1/audit-logs/` is read-only and restricted to owners, property managers, and accountants. Tenants are denied access. List filters are `action`, `model_name`, `user`, `date` (`YYYY-MM-DD`), and `search`; `object_id` can additionally scope logs to one object.

## Reports

All reports are read-only:

- `GET /api/v1/reports/dashboard/`
- `GET /api/v1/reports/occupancy/`
- `GET /api/v1/reports/financial-summary/`
- `GET /api/v1/reports/leases/`
- `GET /api/v1/reports/maintenance/`

Owners see reports for their properties; property managers see reports for actively assigned properties; accountants see portfolio-wide summaries. Tenants can access only `/reports/dashboard/`, which contains their own lease, charge, payment, and maintenance-request summary.

Reports accept `property`, `city`, `start_date`, `end_date`, and `status` filters where relevant. Dates use `YYYY-MM-DD`; `start_date` must not be after `end_date`. Status values are applied to the corresponding source records. The occupancy endpoint is a current snapshot and does not apply date filters. Lease reports additionally accept `days=30`, `days=60`, or `days=90` (default 90) for the expiring-lease window.
