# 07 - Frontend Architecture

## Public marketplace and tenant onboarding

Public marketplace routes:

- `/` — OmniTeckno-branded landing page.
- `/listings` — searchable, filterable, paginated published listings.
- `/listings/:listingId` — shareable listing detail page.
- `/listings/:listingId/apply` — anonymous rental application form.
- `/applications/success` — application submission confirmation.
- `/set-password/?uid=...&token=...` — tenant invitation password setup.

`/listings` and `/listings/:listingId` are shared with the internal listing
module. Owners and property managers receive the existing AppShell management
pages; visitors and other roles receive the public marketplace pages.

Public listing data comes from `/api/v1/listings/public/` and
`/api/v1/listings/public/{id}/`. Both return only published listings attached
to active properties and exclude management timestamps, expiry data, owner
details, and internal workflow records. Public list filters are `search`,
`city`, and `available_date`.

Applications are submitted anonymously to `/api/v1/applications/` using the
backend serializer's applicant fields. Review, approval, lease creation, and
tenant provisioning remain in the authenticated management workflow. Tenant
password setup is offered when the backend creates the tenant account during
lease creation; it does not happen at application approval.

The UI updates document title and description client-side. Production Nginx
must serve client-side routes through the SPA entry point (for example,
`try_files $uri $uri/ /index.html;`) for direct navigation and refreshes.
Server-side rendering or pre-rendering is not configured.

## Finance

The finance area exposes charges, rent schedules, deposits, payments, and
receipts. `/finance/rent-schedules` is available to owners, property managers,
and accountants; tenant users cannot read or manage rent schedules.

Schedules are monthly, one per lease, and use the lease's payment due day.
Create a schedule for an active or expiring lease before generating its rent
charges. The rent-charge page links to schedule management when no active
schedules are available.
