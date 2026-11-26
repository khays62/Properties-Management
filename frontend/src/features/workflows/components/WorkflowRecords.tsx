import { useQuery } from "@tanstack/react-query";
import { ErrorState } from "../../../components/feedback/ErrorState";
import {
  fetchWorkflowRecords,
  getWorkflowErrorMessage,
} from "../api";
import type { WorkflowTableColumn } from "./WorkflowTable";
import { WorkflowTable } from "./WorkflowTable";

export interface WorkflowRecordsProps {
  title: string;
  path: string;
  queryName: string;
  columns: readonly WorkflowTableColumn[];
  actions?: Parameters<typeof WorkflowTable>[0]["actions"];
  emptyMessage?: string;
}

export function WorkflowRecords({
  actions,
  columns,
  emptyMessage,
  path,
  queryName,
  title,
}: WorkflowRecordsProps) {
  const query = useQuery({
    queryKey: ["workflow", queryName],
    queryFn: () => fetchWorkflowRecords(path),
  });

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      {query.isError ? (
        <ErrorState
          title="Unable to load records"
          description={getWorkflowErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <WorkflowTable
          records={query.data ?? []}
          columns={columns}
          actions={actions}
          loading={query.isLoading}
          emptyMessage={emptyMessage}
        />
      )}
    </section>
  );
}
