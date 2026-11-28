import type { ReactNode } from "react";

import { PageTitle } from "./PageTitle";

export interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({
  actions,
  className,
  subtitle,
  title,
}: PageHeaderProps) {
  return (
    <header
      className={[
        "op-page-header flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <PageTitle title={title} subtitle={subtitle} className="min-w-0" />
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}
