import type { UserRole } from "../../types/auth";

export type ReportMetricValue = number | string | null;

export interface DashboardMetrics {
  properties_count?: ReportMetricValue;
  units_count?: ReportMetricValue;
  listings_count?: ReportMetricValue;
  applications_count?: ReportMetricValue;
  leases_count?: ReportMetricValue;
  maintenance_count?: ReportMetricValue;
  active_leases_count?: ReportMetricValue;
  pending_screening_count?: ReportMetricValue;
  expiring_leases_count?: ReportMetricValue;
  open_tickets?: ReportMetricValue;
  occupancy_rate?: ReportMetricValue;
  outstanding_rent?: ReportMetricValue;
  overdue_rent?: ReportMetricValue;
  collected_rent?: ReportMetricValue;
  payments_count?: ReportMetricValue;
  deposits_count?: ReportMetricValue;
  deposits_total?: ReportMetricValue;
  active_deposit_balances?: ReportMetricValue;
  overdue_charges?: ReportMetricValue;
  renewals_count?: ReportMetricValue;
  charges_count?: ReportMetricValue;
  collected_payments?: ReportMetricValue;
  maintenance_requests_count?: ReportMetricValue;
}

export interface DashboardReport {
  role: UserRole;
  metrics: DashboardMetrics;
}

export interface OccupancyReport {
  total_properties: number;
  total_units: number;
  occupied_units: number;
  available_units: number;
  listed_units: number;
  maintenance_units: number;
  rentable_units: number;
  occupancy_rate: ReportMetricValue;
  vacancy_rate: ReportMetricValue;
}

export interface FinancialSummaryReport {
  total_rent_billed: ReportMetricValue;
  total_rent_collected: ReportMetricValue;
  total_outstanding_balance: ReportMetricValue;
  total_overdue_balance: ReportMetricValue;
  total_security_deposits: ReportMetricValue;
  active_deposit_balances: ReportMetricValue;
}

export interface LeaseReport {
  active_leases: number;
  approved_leases: number;
  expiring_leases: number;
  terminated_leases: number;
  expired_leases: number;
  renewed_leases: number;
  expiring_within_days: number;
}

export interface MaintenanceReport {
  open_tickets: number;
  assigned_tickets: number;
  in_progress_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  cancelled_tickets: number;
}
