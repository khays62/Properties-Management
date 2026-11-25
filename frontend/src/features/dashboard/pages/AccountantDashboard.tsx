import type { BadgeVariant } from "../../../components/ui/Badge";
import { DashboardView } from "../components/DashboardView";
import type { DashboardMetric } from "../components/MetricGrid";
import { useDashboard, useFinancialSummary } from "../hooks";
import { formatAmount, formatCount } from "../utils/formatMetrics";

export function AccountantDashboard() {
  const dashboard = useDashboard();
  const financialSummary = useFinancialSummary();
  const overdueCharges = Number(dashboard.data?.metrics.overdue_charges ?? 0);
  const overdueStatus = overdueCharges > 0 ? "overdue" : "resolved";
  const overdueVariant: BadgeVariant =
    overdueCharges > 0 ? "danger" : "success";
  const metrics: DashboardMetric[] = [
    {
      id: "collected-rent",
      title: "Collected Rent",
      value: formatAmount(financialSummary.data?.total_rent_collected),
      kind: "kpi",
    },
    {
      id: "outstanding-rent",
      title: "Outstanding Rent",
      value: formatAmount(financialSummary.data?.total_outstanding_balance),
      kind: "kpi",
    },
    {
      id: "deposits",
      title: "Deposits",
      value: formatAmount(financialSummary.data?.total_security_deposits),
      description: `${formatCount(dashboard.data?.metrics.deposits_count)} deposits`,
      kind: "kpi",
    },
    {
      id: "overdue-charges",
      title: "Overdue Charges",
      value: formatCount(dashboard.data?.metrics.overdue_charges),
      status: overdueStatus,
      statusLabel:
        overdueCharges > 0 ? `${formatCount(overdueCharges)} overdue` : "None overdue",
      statusVariant: overdueVariant,
    },
    {
      id: "payments",
      title: "Payments",
      value: formatCount(dashboard.data?.metrics.payments_count),
    },
  ];
  const isLoading = dashboard.isPending || financialSummary.isPending;
  const hasError =
    (!dashboard.data && dashboard.isError) ||
    (!financialSummary.data && financialSummary.isError);
  const onRetry = () => {
    void Promise.all([dashboard.refetch(), financialSummary.refetch()]);
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
      subtitle="Review collected rent, outstanding balances, deposits, and payments."
      title="Accountant Dashboard"
    />
  );
}
