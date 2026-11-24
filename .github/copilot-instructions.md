# OmniProperties Copilot Instructions

## Project Overview

OmniProperties is a production-oriented property rental management MVP developed for the OmniTeckno Full-Stack Development Challenge.

The system manages:

- Properties and rental units
- Unit availability and listings
- Rental applications
- Applicant screening
- Tenants
- Leases
- Security deposits
- Rent schedules and monthly rent charges
- Payments, payment allocations, invoices, and receipts
- Maintenance tickets
- Lease renewal alerts
- Occupancy and financial reporting

## Mandatory Technology Stack

- Frontend: React with Vite
- Backend: Python and Django
- API: Django REST Framework
- Database: PostgreSQL
- Authentication: JWT access and refresh tokens
- Web server and reverse proxy: Nginx
- Application server: Gunicorn
- Deployment: Linux VPS
- API base path: /api/v1/

Do not replace any mandatory technology with another stack.

Do not use SQLite, MongoDB, Firebase, Node.js, Express, Laravel, or another backend/database as a replacement.

## Required Business Roles

The system has four business roles:

1. Owner
2. Property Manager
3. Tenant
4. Accountant

Django superusers are system administrators and are not a fifth business role.

## Architecture Rules

Use the following backend layers:

1. Models
2. Serializers
3. Permission Classes
4. Selectors
5. Services
6. Views/ViewSets
7. Tests

Complex workflows must use Services.

Never place business workflows inside:

- Views
- Serializers
- Signals
- save() methods

## Database Rules

- PostgreSQL only
- UUID primary keys
- DecimalField for money
- UTC timestamps
- Explicit related_name
- Constraints
- Indexes
- Migrations committed

## Frontend Rules

- Functional React Components
- TypeScript
- Shared Component System
- Feature Based Architecture
- Role Based Navigation
