# 05 - Workflows

## Rental application and screening

1. An applicant submits a rental application for a published listing. Submission is public and includes applicant details, a move-in date, and optional notes.
2. The API creates the applicant and application together. The move-in date must be today or later. An active application for the same listing and normalized applicant email is rejected.
3. An owner or assigned property manager moves a submitted application to `UNDER_REVIEW`.
4. The manager starts screening. The application moves to `SCREENING` and receives one `PENDING` screening.
5. The manager starts the screening, then records a `PASSED` or `FAILED` result, score, verification flags, and review metadata.
6. A screening-passed application may be approved. Applications in screening may be rejected with a required rejection reason.
7. Applications may be withdrawn while `SUBMITTED` or `UNDER_REVIEW`.

Application and screening records are visible only to owners of the related property and property managers with an active assignment. Anonymous applicants can submit applications but cannot access application or screening review data.

## Lease and tenant lifecycle

1. An owner or assigned property manager creates a draft lease from an approved application with a passed screening. If the applicant does not yet have a tenant profile, the service links an existing account by email or provisions a tenant account and profile.
2. Newly provisioned tenant accounts have no usable password. A one-time, time-limited password setup link is emailed; no password is emailed or stored in plaintext.
3. The lease moves from `DRAFT` to `PENDING_APPROVAL`, then `APPROVED`. A lease must have a positive monthly rent, a nonnegative deposit, a due day from 1 to 31, and a start date before its end date.
4. An approved lease can be activated atomically with the unit changing from `LISTED` to `OCCUPIED` and its published listing changing to `CLOSED`.
5. Active leases can be renewed. Renewal marks the existing lease `RENEWED` and creates a successor in `PENDING_APPROVAL`, starting the day after the existing end date. Activating a renewal leaves the already occupied unit and closed listing unchanged.
6. Termination and expiry release the unit to `AVAILABLE` but do not reopen the closed listing. Expiry is allowed only after the lease end date.
7. Approved, active, and expiring leases block overlapping periods for the same unit. The service validates periods while holding the unit lock; model and serializer validation provide additional checks.

## Renewal alerts

The renewal service creates idempotent alerts 90, 60, and 30 days before lease expiry. When an active lease enters its 90-day window, it moves to `EXPIRING` and a status-history entry is recorded. The generation service must be called by a scheduled job; no scheduler is configured by this module.

Tenant users can view only their own leases and renewal alerts. Owner and property-manager access is scoped to owned or actively assigned properties.

## Rent, deposits, and payments

1. After a lease is activated, an owner, assigned property manager, or accountant creates its monthly rent schedule. The schedule uses the lease's payment due day.
2. The monthly charge generator creates one charge per lease and billing month/year. The charge starts with `balance == amount`; duplicate generation returns the existing charge. Due days beyond a month's length are clamped to that month's last day.
3. Deposit records are separate from rent charges. Deposit payments only update the deposit's paid amount and status; they never create or reduce rent allocations.
4. A payment is recorded as `PENDING` with a unique reference. It can then be allocated across one or more of that tenant's rent charges. Allocations must sum to the payment amount and cannot exceed any charge's remaining balance.
5. Allocation updates each rent charge balance and status atomically. A fully paid charge becomes `PAID`; a partial charge becomes `PARTIALLY_PAID` unless its due date has passed, in which case it remains `OVERDUE`. A receipt is generated once the payment is completed.
6. Reversing a completed payment restores its allocations to the original charge balances and marks the payment `REVERSED`. The receipt and allocation rows remain as financial history.
7. Charges with a positive balance become `OVERDUE` only after their due date. A generator run also creates past-due charges with `OVERDUE` status.

Finance actions run through services and database transactions. Accountants have finance-wide access; owners and property managers are restricted to their properties; tenant users can read only their own deposits, charges, payments, and receipts.

## Maintenance tickets

1. A tenant can create a ticket only for a unit marked `OCCUPIED` with a current `ACTIVE` lease belonging to that tenant. The ticket starts in `OPEN`.
2. An owner or assigned property manager can assign an open ticket to a property manager actively assigned to the ticket's property. Assignment moves the ticket to `ASSIGNED`.
3. Tickets move through `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, and `CLOSED` in order. Resolving a ticket requires resolution notes. Invalid transitions are rejected.
4. An open ticket may be cancelled by its tenant or a manager with access to the property. `CANCELLED` is terminal.
5. Ticket creation, updates, assignment, work start, resolution, closure, and cancellation atomically create corresponding activity records.
6. Tenants can view and upload attachments only on their own tickets. Attachments are limited to JPG, JPEG, PNG, and PDF files up to 5 MB.

Owners and property managers only see tickets for owned or actively assigned properties. Tenants see only their own tickets and activity history.

## Notifications

1. Notifications are created for a specific user and are unread by default. Users can list, retrieve, search, and mark read only their own notifications.
2. The notification service marks one notification or all of the current user's unread notifications as read.
3. Lease approval and activation, payment creation and reversal, and maintenance assignment and resolution create notifications for the tenant. Application approval and rejection notify an existing tenant account that matches the applicant's email.
4. Renewal-alert generation creates a tenant notification only when it creates a new 90-, 60-, or 30-day alert, so rerunning the generator does not duplicate notifications for existing alerts.
5. Notifications are created in the same transaction as the domain workflow. Application notifications require an existing tenant account; the application workflow does not provision accounts.

## Audit history

1. Domain services append audit records for property archival, listing publication and closure, application approval and rejection, lease approval, activation and renewal, payment creation and reversal, and maintenance assignment and resolution.
2. Each record captures the actor, action, model and object identifiers, optional old/new data, and request IP address and user agent where the workflow has request context.
3. Audit records are append-only. The API is read-only and available to owners, property managers, and accountants; tenants cannot read audit history.
4. Audit writes occur in the corresponding domain transaction, so a failed workflow does not leave a success-shaped audit record.

## Reports and dashboards

1. Reports are read-only aggregates over existing domain records; there are no report snapshots or report-specific database tables.
2. Owner and property-manager reports are scoped to owned or actively assigned properties. Accountant reports are portfolio-wide.
3. Tenants may access only the dashboard summary for their own leases, charges, payments, and maintenance requests. They cannot access aggregate occupancy, finance, lease, or maintenance reports.
4. Occupancy is a current snapshot. Maintenance date filters apply to ticket creation dates, lease date ranges select leases overlapping that period, rent charges use due dates, and payment collections use payment dates.
5. Lease reports accept `days=30`, `days=60`, or `days=90` to count active/expiring leases whose end date falls in that future window.
