import { DashboardView } from "../components/DashboardView";
import type { DashboardMetric } from "../components/MetricGrid";
import {
  useDashboard,
  useLeaseReport,
  useMaintenanceReport,
  useOccupancy,
} from "../hooks";
import {
  formatAmount,
  formatCount,
  formatPercentage,
} from "../utils/formatMetrics";

export function OwnerDashboard() {
  const dashboard = useDashboard();
  const occupancy = useOccupancy();
  const leases = useLeaseReport();
  const maintenance = useMaintenanceReport();
  const openTickets = maintenance.data?.open_tickets ?? 0;
  const metrics: DashboardMetric[] = [
    {
      id: "properties",
      title: "Properties",
      value: formatCount(occupancy.data?.total_properties),
    },
    {
      id: "units",
      title: "Units",
      value: formatCount(occupancy.data?.total_units),
    },
    {
      id: "occupancy",
      title: "Occupancy Rate",
      value: formatPercentage(occupancy.data?.occupancy_rate),
      kind: "kpi",
    },
    {
      id: "outstanding-rent",
      title: "Outstanding Rent",
      value: formatAmount(dashboard.data?.metrics.outstanding_rent),
      kind: "kpi",
    },
    {
      id: "active-leases",
      title: "Active Leases",
      value: formatCount(leases.data?.active_leases),
    },
    {
      id: "open-maintenance",
      title: "Open Maintenance",
      value: formatCount(maintenance.data?.open_tickets),
      status: openTickets > 0 ? "open" : "resolved",
      statusLabel: openTickets > 0 ? `${openTickets} open` : "None open",
    },
  ];
  const isLoading =
    dashboard.isPending ||
    occupancy.isPending ||
    leases.isPending ||
    maintenance.isPending;
  const hasError =
    (!dashboard.data && dashboard.isError) ||
    (!occupancy.data && occupancy.isError) ||
    (!leases.data && leases.isError) ||
    (!maintenance.data && maintenance.isError);
  const onRetry = () => {
    void Promise.all([
      dashboard.refetch(),
      occupancy.refetch(),
      leases.refetch(),
      maintenance.refetch(),
    ]);
  };

  return (
    <DashboardView
      hasError={hasError}
      hasMetrics={Boolean(
        dashboard.data && Object.keys(dashboard.data.metrics).length,
      )}
      isLoading={isLoading}
      metrics={metrics}
      onRetry={onRetry}
      subtitle="A summary of your properties, occupancy, leases, and maintenance."
      title="Owner Dashboard"
    />
  );
}
