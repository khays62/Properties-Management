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


class MaintenanceStatus(models.TextChoices):
    OPEN = "OPEN", "Open"
    ASSIGNED = "ASSIGNED", "Assigned"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    RESOLVED = "RESOLVED", "Resolved"
    CLOSED = "CLOSED", "Closed"
    CANCELLED = "CANCELLED", "Cancelled"
