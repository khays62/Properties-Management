import type { ReactNode } from "react";

import { DataTable, type DataTableColumn } from "../../../components/data";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import {
  getRecordText,
  type WorkflowRecord,
} from "../api";

export interface WorkflowTableColumn {
  key: string;
  label: string;
  render?: (record: WorkflowRecord) => ReactNode;
}

export interface WorkflowTableProps {
  records: readonly WorkflowRecord[];
  columns: readonly WorkflowTableColumn[];
  loading?: boolean;
  actions?: (record: WorkflowRecord) => ReactNode;
  emptyMessage?: string;
  className?: string;
}

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function WorkflowTable({
  actions,
  className,
  columns,
  emptyMessage,
  loading,
  records,
}: WorkflowTableProps) {
  const tableColumns: DataTableColumn<WorkflowRecord>[] = columns.map(
    (column) => ({
      id: column.key,
      header: column.label,
      sortValue: (record) => getRecordText(record, column.key),
      render: (record) =>
        column.render ? (
          column.render(record)
        ) : column.key === "status" ? (
          <StatusBadge
            status={getRecordText(record, column.key)}
            label={formatStatus(getRecordText(record, column.key))}
          />
        ) : (
          <span className="block max-w-64 truncate">
            {getRecordText(record, column.key)}
          </span>
        ),
    }),
  );

  if (actions) {
    tableColumns.push({
      id: "actions",
      header: "Actions",
      sortable: false,
      render: actions,
    });
  }

  return (
    <DataTable
      className={className}
      ariaLabel="Workflow records"
      columns={tableColumns}
      data={records}
      getRowId={(record) => record.id}
      loading={loading}
      emptyMessage={emptyMessage}
    />
  );
}

export function StatusCell({ status }: { status: string }) {
  return <StatusBadge status={status} />;
}
