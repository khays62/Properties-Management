import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../hooks/useAuth";
import { reportsApi } from "../api/reports.api";

function useReportQuery<T>(
  report: string,
  queryFn: () => Promise<T>,
  params?: readonly unknown[],
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["reports", user?.id, report, ...(params ?? [])],
    queryFn,
    enabled: Boolean(user?.id),
  });
}

export function useDashboard() {
  return useReportQuery("dashboard", reportsApi.getDashboard);
}

export function useOccupancy() {
  return useReportQuery("occupancy", reportsApi.getOccupancy);
}

export function useFinancialSummary() {
  return useReportQuery("financial-summary", reportsApi.getFinancialSummary);
}

export function useLeaseReport(days = 90) {
  return useReportQuery(
    "leases",
    () => reportsApi.getLeaseReport(days),
    [days],
  );
}

export function useMaintenanceReport() {
  return useReportQuery("maintenance", reportsApi.getMaintenanceReport);
}
