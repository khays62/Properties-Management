import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import { DashboardHeader } from "./DashboardHeader";
import { MetricGrid, type DashboardMetric } from "./MetricGrid";

export interface DashboardViewProps {
  title: string;
  subtitle: string;
  metrics: readonly DashboardMetric[];
  isLoading: boolean;
  hasError: boolean;
  hasMetrics: boolean;
  onRetry: () => void;
}

export function DashboardView({
  hasError,
  hasMetrics,
  isLoading,
  metrics,
  onRetry,
  subtitle,
  title,
}: DashboardViewProps) {
  return (
    <div className="space-y-6">
      <DashboardHeader title={title} subtitle={subtitle} />
      {isLoading ? (
        <div className="grid min-h-48 place-items-center">
          <LoadingSpinner label={`Loading ${title.toLowerCase()}`} />
        </div>
      ) : hasError ? (
        <ErrorState
          description="The report data could not be loaded. Check your connection and try again."
          onRetry={onRetry}
        />
      ) : !hasMetrics ? (
        <EmptyState
          title="No dashboard data available"
          description="There are no report metrics to display for this account yet."
        />
      ) : (
        <MetricGrid metrics={metrics} />
      )}
    </div>
  );
}
