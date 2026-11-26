import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import {
  DataTable,
  PageHeader,
  Pagination,
  SearchFilterBar,
  type DataTableColumn,
  type FilterDefinition,
} from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { useAuth } from "../../../hooks/useAuth";
import { getFinanceErrorMessage } from "../api/finance.api";
import { FinanceNavigation } from "../components/FinanceNavigation";
import { useReceipts } from "../hooks/useFinance";
import type { Receipt, ReceiptQueryParams } from "../types/finance";

const PAGE_SIZE = 20;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function ReceiptListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canFilterTenant =
    user?.role === "OWNER" ||
    user?.role === "PROPERTY_MANAGER" ||
    user?.role === "ACCOUNTANT";
  const search = searchParams.get("search") ?? "";
  const [searchValue, setSearchValue] = useState(search);
  const payment = searchParams.get("payment") ?? "";
  const tenant = searchParams.get("tenant") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const params: ReceiptQueryParams = {
    search: search || undefined,
    payment: payment || undefined,
    tenant: tenant || undefined,
    page,
  };
  const query = useReceipts(params);
  const filters: FilterDefinition[] = [
    ...(canFilterTenant
      ? [
          {
            id: "tenant",
            label: "Tenant ID",
            type: "text" as const,
            value: tenant,
            placeholder: "Filter by tenant UUID",
          },
        ]
      : []),
    {
      id: "payment",
      label: "Payment ID",
      type: "text",
      value: payment,
      placeholder: "Filter by payment UUID",
    },
  ];

  const columns = useMemo<DataTableColumn<Receipt>[]>(
    () => [
      {
        id: "receipt_number",
        header: "Receipt number",
        sortValue: (receipt) => receipt.receipt_number,
        render: (receipt) => (
          <Link
            to={`/finance/receipts/${receipt.id}`}
            state={{ returnTo: `${location.pathname}${location.search}` }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            {receipt.receipt_number}
          </Link>
        ),
      },
      {
        id: "payment",
        header: "Payment ID",
        sortValue: (receipt) => receipt.payment,
        render: (receipt) => (
          <Link
            to={`/finance/payments/${receipt.payment}`}
            className="font-medium text-omni-blue hover:underline"
          >
            {receipt.payment}
          </Link>
        ),
      },
      {
        id: "generated_at",
        header: "Generated",
        sortValue: (receipt) => receipt.generated_at,
        render: (receipt) => formatDateTime(receipt.generated_at),
      },
    ],
    [location.pathname, location.search],
  );

  function updateParam(name: string, value: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(name, value);
        else next.delete(name);
        if (name !== "page") next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function resetFilters() {
    setSearchValue("");
    setSearchParams({}, { replace: true });
  }

  return (
    <div className="space-y-6 py-6">
      <FinanceNavigation />
      <PageHeader
        title="Receipts"
        subtitle="View receipts generated for completed, allocated payments."
      />
      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearch={(value) => updateParam("search", value.trim())}
        searchLabel="Search receipts"
        filters={filters}
        onFilterChange={(id, value) => updateParam(id, value)}
        onReset={resetFilters}
      />
      {query.isError ? (
        <ErrorState
          title="Unable to load receipts"
          description={getFinanceErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Receipts"
            columns={columns}
            data={query.data?.results ?? []}
            getRowId={(receipt) => receipt.id}
            loading={query.isLoading}
            emptyMessage={
              search || payment || tenant
                ? "No receipts match the selected filters."
                : "No receipts have been generated."
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={query.data?.count ?? 0}
            onPageChange={(nextPage) => updateParam("page", String(nextPage))}
          />
        </>
      )}
    </div>
  );
}
