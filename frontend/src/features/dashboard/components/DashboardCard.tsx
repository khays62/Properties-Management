import type { ReactNode } from "react";

import { Card } from "../../../components/ui/Card";
import type { BadgeVariant } from "../../../components/ui/Badge";
import { StatusBadge } from "../../../components/ui/StatusBadge";

export interface DashboardCardProps {
  title: string;
  children: ReactNode;
  description?: ReactNode;
  status?: string;
  statusLabel?: string;
  statusVariant?: BadgeVariant;
  className?: string;
}

export function DashboardCard({
  children,
  className,
  description,
  status,
  statusLabel,
  statusVariant,
  title,
}: DashboardCardProps) {
  return (
    <Card
      className={[
        "flex h-full flex-col gap-4 border border-[var(--color-border)] bg-card p-5 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-medium text-text-secondary">{title}</h2>
        {status && (
          <StatusBadge
            status={status}
            label={statusLabel}
            variant={statusVariant}
          />
        )}
      </div>
      <div className="flex-1">{children}</div>
      {description && (
        <p className="text-xs leading-5 text-text-secondary">{description}</p>
      )}
    </Card>
  );
}
