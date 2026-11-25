from django.db import models


class UserRole(models.TextChoices):
    OWNER = "OWNER", "Owner"
    PROPERTY_MANAGER = "PROPERTY_MANAGER", "Property Manager"
    TENANT = "TENANT", "Tenant"
    ACCOUNTANT = "ACCOUNTANT", "Accountant"


class PropertyStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    ARCHIVED = "ARCHIVED", "Archived"


class UnitStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", "Available"
    LISTED = "LISTED", "Listed"
    RESERVED = "RESERVED", "Reserved"
    OCCUPIED = "OCCUPIED", "Occupied"
    MAINTENANCE = "MAINTENANCE", "Maintenance"
    INACTIVE = "INACTIVE", "Inactive"


class ListingStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PUBLISHED = "PUBLISHED", "Published"
    PAUSED = "PAUSED", "Paused"
    CLOSED = "CLOSED", "Closed"
    EXPIRED = "EXPIRED", "Expired"


class EmploymentStatus(models.TextChoices):
    EMPLOYED = "EMPLOYED", "Employed"
    SELF_EMPLOYED = "SELF_EMPLOYED", "Self-employed"
    UNEMPLOYED = "UNEMPLOYED", "Unemployed"
    STUDENT = "STUDENT", "Student"


class ApplicationStatus(models.TextChoices):
    SUBMITTED = "SUBMITTED", "Submitted"
    UNDER_REVIEW = "UNDER_REVIEW", "Under Review"
    SCREENING = "SCREENING", "Screening"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"
    WITHDRAWN = "WITHDRAWN", "Withdrawn"


class ScreeningStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    PASSED = "PASSED", "Passed"
    FAILED = "FAILED", "Failed"
    NEEDS_REVIEW = "NEEDS_REVIEW", "Needs Review"


class LeaseStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PENDING_APPROVAL = "PENDING_APPROVAL", "Pending Approval"
    APPROVED = "APPROVED", "Approved"
    ACTIVE = "ACTIVE", "Active"
    EXPIRING = "EXPIRING", "Expiring"
    RENEWED = "RENEWED", "Renewed"
    TERMINATED = "TERMINATED", "Terminated"
    EXPIRED = "EXPIRED", "Expired"


class TenantStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    INACTIVE = "INACTIVE", "Inactive"
    MOVED_OUT = "MOVED_OUT", "Moved Out"


class RenewalAlertStatus(models.TextChoices):
    UNREAD = "UNREAD", "Unread"
    READ = "READ", "Read"
    RESOLVED = "RESOLVED", "Resolved"


class DepositStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
    PAID = "PAID", "Paid"
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED", "Partially Refunded"
    REFUNDED = "REFUNDED", "Refunded"
    FORFEITED = "FORFEITED", "Forfeited"


class RentChargeStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PARTIALLY_PAID = "PARTIALLY_PAID", "Partially Paid"
    PAID = "PAID", "Paid"
    OVERDUE = "OVERDUE", "Overdue"
    CANCELLED = "CANCELLED", "Cancelled"


class PaymentStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"
    REVERSED = "REVERSED", "Reversed"


class PaymentMethod(models.TextChoices):
    CASH = "CASH", "Cash"
    BANK_TRANSFER = "BANK_TRANSFER", "Bank Transfer"
    MOBILE_MONEY = "MOBILE_MONEY", "Mobile Money"
    CARD = "CARD", "Card"


class RentFrequency(models.TextChoices):
    MONTHLY = "MONTHLY", "Monthly"


class MaintenanceStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    ASSIGNED = "ASSIGNED", "Assigned"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"
    CANCELLED = "CANCELLED", "Cancelled"


class MaintenanceCategory(models.TextChoices):
    PLUMBING = "PLUMBING", "Plumbing"
    ELECTRICAL = "ELECTRICAL", "Electrical"
    CLEANING = "CLEANING", "Cleaning"
    SECURITY = "SECURITY", "Security"
    HVAC = "HVAC", "HVAC"
    OTHER = "OTHER", "Other"


class MaintenancePriority(models.TextChoices):
    LOW = "LOW", "Low"
    MEDIUM = "MEDIUM", "Medium"
    HIGH = "HIGH", "High"
    URGENT = "URGENT", "Urgent"


class MaintenanceActivityAction(models.TextChoices):
    CREATED = "CREATED", "Created"
    ASSIGNED = "ASSIGNED", "Assigned"
    STARTED = "STARTED", "Started"
    UPDATED = "UPDATED", "Updated"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"
    CANCELLED = "CANCELLED", "Cancelled"


class NotificationType(models.TextChoices):
    LEASE = "LEASE", "Lease"
    PAYMENT = "PAYMENT", "Payment"
    RENEWAL = "RENEWAL", "Renewal"
    MAINTENANCE = "MAINTENANCE", "Maintenance"
    SYSTEM = "SYSTEM", "System"


class AuditAction(models.TextChoices):
    PROPERTY_ARCHIVED = "PROPERTY_ARCHIVED", "Property archived"
    LISTING_PUBLISHED = "LISTING_PUBLISHED", "Listing published"
    LISTING_CLOSED = "LISTING_CLOSED", "Listing closed"
    APPLICATION_APPROVED = "APPLICATION_APPROVED", "Application approved"
    APPLICATION_REJECTED = "APPLICATION_REJECTED", "Application rejected"
    LEASE_APPROVED = "LEASE_APPROVED", "Lease approved"
    LEASE_ACTIVATED = "LEASE_ACTIVATED", "Lease activated"
    LEASE_RENEWED = "LEASE_RENEWED", "Lease renewed"
    PAYMENT_CREATED = "PAYMENT_CREATED", "Payment created"
    PAYMENT_REVERSED = "PAYMENT_REVERSED", "Payment reversed"
    MAINTENANCE_ASSIGNED = "MAINTENANCE_ASSIGNED", "Maintenance assigned"
    MAINTENANCE_RESOLVED = "MAINTENANCE_RESOLVED", "Maintenance resolved"
