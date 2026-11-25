import { DashboardView } from "../components/DashboardView";
import type { DashboardMetric } from "../components/MetricGrid";
import { useDashboard, useLeaseReport, useMaintenanceReport } from "../hooks";
import { formatCount } from "../utils/formatMetrics";

export function PropertyManagerDashboard() {
  const dashboard = useDashboard();
  const leases = useLeaseReport();
  const maintenance = useMaintenanceReport();
  const metrics: DashboardMetric[] = [
    {
      id: "listings",
      title: "Listings",
      value: formatCount(dashboard.data?.metrics.listings_count),
    },
    {
      id: "applications",
      title: "Applications",
      value: formatCount(dashboard.data?.metrics.applications_count),
    },
    {
      id: "pending-screening",
      title: "Pending Screening",
      value: formatCount(dashboard.data?.metrics.pending_screening_count),
      status: "pending",
      statusLabel: "Awaiting review",
    },
    {
      id: "expiring-leases",
      title: "Expiring Leases",
      value: formatCount(leases.data?.expiring_leases),
      description: "Expiring within 90 days",
    },
    {
      id: "maintenance",
      title: "Maintenance",
      value: formatCount(dashboard.data?.metrics.maintenance_count),
      description: `${formatCount(maintenance.data?.open_tickets)} open tickets`,
    },
  ];
  const isLoading =
    dashboard.isPending || leases.isPending || maintenance.isPending;
  const hasError =
    (!dashboard.data && dashboard.isError) ||
    (!leases.data && leases.isError) ||
    (!maintenance.data && maintenance.isError);
  const onRetry = () => {
    void Promise.all([
      dashboard.refetch(),
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
      subtitle="Track listing activity, applicant screening, lease renewals, and maintenance."
      title="Property Manager Dashboard"
    />
  );
}
