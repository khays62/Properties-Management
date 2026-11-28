import { useMemo, useState, type Key, type ReactNode } from "react";

import { EmptyState } from "../feedback/EmptyState";
import { LoadingSpinner } from "../feedback/LoadingSpinner";
import { Card } from "../ui/Card";

export type DataTableSortValue =
  | string
  | number
  | boolean
  | Date
  | null
  | undefined;

export interface DataTableColumn<T> {
  id: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => DataTableSortValue;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

export interface DataTableProps<T> {
  columns: readonly DataTableColumn<T>[];
  data: readonly T[];
  getRowId: (row: T) => Key;
  loading?: boolean;
  emptyMessage?: string;
  caption?: ReactNode;
  ariaLabel?: string;
  className?: string;
}

type SortDirection = "ascending" | "descending";

interface SortState {
  columnId: string;
  direction: SortDirection;
}

function compareSortValues(
  left: DataTableSortValue,
  right: DataTableSortValue,
): number {
  if (left == null || right == null) {
    if (left == null && right == null) return 0;
    return left == null ? 1 : -1;
  }

  if (left instanceof Date && right instanceof Date) {
    return left.getTime() - right.getTime();
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function DataTable<T>({
  ariaLabel,
  caption,
  className,
  columns,
  data,
  emptyMessage = "No records found.",
  getRowId,
  loading = false,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(null);
  const sortColumn = columns.find((column) => column.id === sort?.columnId);

  const sortedData = useMemo(() => {
    if (!sort || !sortColumn?.sortValue) return data;

    const direction = sort.direction === "ascending" ? 1 : -1;
    return [...data].sort(
      (left, right) =>
        compareSortValues(
          sortColumn.sortValue?.(left),
          sortColumn.sortValue?.(right),
        ) * direction,
    );
  }, [data, sort, sortColumn]);

  function toggleSort(column: DataTableColumn<T>) {
    if (!column.sortValue || column.sortable === false) return;

    setSort((current) => ({
      columnId: column.id,
      direction:
        current?.columnId === column.id &&
        current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }

  return (
    <Card
      aria-busy={loading}
      className={["overflow-hidden p-0", className].filter(Boolean).join(" ")}
    >
      <div className="overflow-x-auto">
        <table
          aria-label={ariaLabel}
          className="op-table w-full min-w-[40rem] border-collapse text-left text-sm text-text-primary"
        >
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="op-table__head">
            <tr>
              {columns.map((column) => {
                const isSorted = sort?.columnId === column.id;
                const isSortable =
                  Boolean(column.sortValue) && column.sortable !== false;

                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={
                      isSorted ? sort.direction : undefined
                    }
                    className={[
                      "whitespace-nowrap border-b border-[var(--color-border)] px-4 py-3 font-semibold",
                      "op-table__heading",
                      column.headerClassName,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        aria-label={`Sort by ${column.id}`}
                        onClick={() => toggleSort(column)}
                        className="op-table__sort inline-flex items-center gap-2 rounded-sm text-left hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {column.header}
                        <svg
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0"
                          fill="none"
                          viewBox="0 0 16 16"
                        >
                          <path
                            d="M8 2.5v11m0 0-3-3m3 3 3-3"
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                          />
                          {isSorted && (
                            <path
                              d={
                                sort.direction === "ascending"
                                  ? "M4 5.5 8 2.5l4 3"
                                  : "M4 10.5 8 13.5l4-3"
                              }
                              stroke="currentColor"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="1.5"
                            />
                          )}
                        </svg>
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td
                  colSpan={Math.max(columns.length, 1)}
                  className="px-4 py-8 text-center"
                >
                  <LoadingSpinner label="Loading data" />
                </td>
              </tr>
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)}>
                  <EmptyState title={emptyMessage} className="py-8" />
                </td>
              </tr>
            ) : (
              sortedData.map((row) => (
                <tr
                  key={getRowId(row)}
                  className="op-table__row"
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={[
                        "op-table__cell px-4 py-3 align-middle",
                        column.className,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
