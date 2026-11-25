import type { ReactNode } from "react";

import type { BadgeVariant } from "../../../components/ui/Badge";
import { DashboardCard } from "./DashboardCard";

export interface KpiCardProps {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  status?: string;
  statusLabel?: string;
  statusVariant?: BadgeVariant;
  className?: string;
}

export function KpiCard({
  className,
  description,
  status,
  statusLabel,
  statusVariant,
  title,
  value,
}: KpiCardProps) {
  return (
    <DashboardCard
      className={className}
      description={description}
      status={status}
      statusLabel={statusLabel}
      statusVariant={statusVariant}
      title={title}
    >
      <p className="break-words text-3xl font-semibold tracking-tight text-text-primary">
        {value}
      </p>
    </DashboardCard>
  );
}
