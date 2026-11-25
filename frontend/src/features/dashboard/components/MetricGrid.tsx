import type { ReactNode } from "react";

import type { BadgeVariant } from "../../../components/ui/Badge";
import { KpiCard } from "./KpiCard";
import { StatCard } from "./StatCard";

export interface DashboardMetric {
  id: string;
  title: string;
  value: ReactNode;
  description?: ReactNode;
  kind?: "kpi" | "stat";
  status?: string;
  statusLabel?: string;
  statusVariant?: BadgeVariant;
}

export interface MetricGridProps {
  metrics: readonly DashboardMetric[];
  className?: string;
}

export function MetricGrid({ className, metrics }: MetricGridProps) {
  return (
    <div
      className={[
        "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {metrics.map((metric) => {
        const CardComponent = metric.kind === "kpi" ? KpiCard : StatCard;
        return (
          <CardComponent
            key={metric.id}
            className="min-w-0"
            description={metric.description}
            status={metric.status}
            statusLabel={metric.statusLabel}
            statusVariant={metric.statusVariant}
            title={metric.title}
            value={metric.value}
          />
        );
      })}
    </div>
  );
}
