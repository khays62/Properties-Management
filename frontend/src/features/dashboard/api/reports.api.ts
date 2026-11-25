import { api } from "../../../services/api";
import type {
  DashboardReport,
  FinancialSummaryReport,
  LeaseReport,
  MaintenanceReport,
  OccupancyReport,
} from "../types";

async function getDashboard(): Promise<DashboardReport> {
  const { data } = await api.get<DashboardReport>("reports/dashboard/");
  return data;
}

async function getOccupancy(): Promise<OccupancyReport> {
  const { data } = await api.get<OccupancyReport>("reports/occupancy/");
  return data;
}

async function getFinancialSummary(): Promise<FinancialSummaryReport> {
  const { data } = await api.get<FinancialSummaryReport>(
    "reports/financial-summary/",
  );
  return data;
}

async function getLeaseReport(days = 90): Promise<LeaseReport> {
  const { data } = await api.get<LeaseReport>("reports/leases/", {
    params: { days },
  });
  return data;
}

async function getMaintenanceReport(): Promise<MaintenanceReport> {
  const { data } = await api.get<MaintenanceReport>("reports/maintenance/");
  return data;
}

export const reportsApi = {
  getDashboard,
  getOccupancy,
  getFinancialSummary,
  getLeaseReport,
  getMaintenanceReport,
};
