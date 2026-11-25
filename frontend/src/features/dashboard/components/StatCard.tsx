import type { ReactNode } from "react";

import type { BadgeVariant } from "../../../components/ui/Badge";
import { DashboardCard } from "./DashboardCard";

export interface StatCardProps {
  title: string;
  value: ReactNode;
  description?: ReactNode;
  status?: string;
  statusLabel?: string;
  statusVariant?: BadgeVariant;
  className?: string;
}

export function StatCard({
  className,
  description,
  status,
  statusLabel,
  statusVariant,
  title,
  value,
}: StatCardProps) {
  return (
    <DashboardCard
      className={className}
      description={description}
      status={status}
      statusLabel={statusLabel}
      statusVariant={statusVariant}
      title={title}
    >
      <p className="break-words text-2xl font-semibold tracking-tight text-text-primary">
        {value}
      </p>
    </DashboardCard>
  );
}
