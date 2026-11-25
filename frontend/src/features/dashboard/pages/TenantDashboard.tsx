import { DashboardView } from "../components/DashboardView";
import type { DashboardMetric } from "../components/MetricGrid";
import { useDashboard } from "../hooks";
import { formatAmount, formatCount } from "../utils/formatMetrics";

export function TenantDashboard() {
  const dashboard = useDashboard();
  const metrics: DashboardMetric[] = [
    {
      id: "active-lease",
      title: "Active Lease",
      value: formatCount(dashboard.data?.metrics.active_leases_count),
    },
    {
      id: "current-charges",
      title: "Current Charges",
      value: formatAmount(dashboard.data?.metrics.outstanding_rent),
      description: `${formatCount(dashboard.data?.metrics.charges_count)} charges`,
      kind: "kpi",
    },
    {
      id: "payments",
      title: "Payments",
      value: formatCount(dashboard.data?.metrics.payments_count),
      description: `Amount collected: ${formatAmount(dashboard.data?.metrics.collected_payments)}`,
    },
    {
      id: "maintenance-requests",
      title: "Maintenance Requests",
      value: formatCount(dashboard.data?.metrics.maintenance_requests_count),
      status:
        Number(dashboard.data?.metrics.open_tickets ?? 0) > 0
          ? "open"
          : undefined,
      statusLabel:
        Number(dashboard.data?.metrics.open_tickets ?? 0) > 0
          ? `${formatCount(dashboard.data?.metrics.open_tickets)} open`
          : undefined,
    },
  ];

  return (
    <DashboardView
      hasError={!dashboard.data && dashboard.isError}
      hasMetrics={Boolean(
        dashboard.data && Object.keys(dashboard.data.metrics).length,
      )}
      isLoading={dashboard.isPending}
      metrics={metrics}
      onRetry={() => {
        void dashboard.refetch();
      }}
      subtitle="A personal overview of your lease, charges, payments, and maintenance requests."
      title="Tenant Dashboard"
    />
  );
}
