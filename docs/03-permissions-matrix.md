# 03 - Permissions Matrix

| Resource | Owner | Property Manager | Tenant | Accountant |
| --- | --- | --- | --- | --- |
| Notifications | Own only | Own only | Own only | Own only |
| Audit logs | Read | Read | No access | Read |
| Reports | Owned properties | Assigned properties | Personal dashboard only | Portfolio-wide |

Audit visibility is role-based. Notification visibility is always scoped to the authenticated user, regardless of role.

Report queries inherit property scope for owners and property managers. Accountants can view portfolio-wide reports. Tenants can access only their personal dashboard; the aggregate report endpoints are denied.
