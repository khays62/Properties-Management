import type { ReactNode } from "react";

import { PageHeader } from "../../../components/data";

export interface WorkflowPageProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function WorkflowPage({ children, subtitle, title }: WorkflowPageProps) {
  return (
    <div className="space-y-6 py-6">
      <PageHeader title={title} subtitle={subtitle} />
      {children}
    </div>
  );
}
