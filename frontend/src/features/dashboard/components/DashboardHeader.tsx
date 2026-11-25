import type { ReactNode } from "react";

import { PageHeader } from "../../../components/data/PageHeader";

export interface DashboardHeaderProps {
  title: string;
  subtitle?: ReactNode;
  className?: string;
}

export function DashboardHeader({
  className,
  subtitle,
  title,
}: DashboardHeaderProps) {
  return (
    <PageHeader
      className={className}
      subtitle={subtitle}
      title={title}
    />
  );
}
