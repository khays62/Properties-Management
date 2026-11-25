# 04 - Database Design

## Notifications

`Notification` uses a UUID primary key and references its recipient user. It stores title, message, type, read state, and UTC timestamps. Indexes support per-user unread and type-filtered chronological queries.

## Audit

`AuditLog` uses a UUID primary key and stores the actor (protected from deletion), action, model name, string object ID, optional JSON old/new data, optional IP address and user agent, and UTC timestamps. Indexes support action/date, model/object/date, and user/date lookups. A database check constraint restricts actions to the declared audit action set; application-level protections reject updates and deletes.

## Reports

Reports introduce no models, tables, or migrations. They aggregate existing property, unit, listing, application, lease, finance, and maintenance records at query time.
