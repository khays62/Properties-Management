import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import {
  DataTable,
  PageHeader,
  Pagination,
  SearchFilterBar,
  type DataTableColumn,
  type FilterDefinition,
} from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { toastService } from "../../../services/toastService";
import { getFinanceErrorMessage } from "../api/finance.api";
import { DepositActionsMenu } from "../components/DepositActionsMenu";
import { DepositCreateModal } from "../components/DepositCreateModal";
import { DepositWorkflowDialogs } from "../components/DepositWorkflowDialogs";
import { FinanceNavigation } from "../components/FinanceNavigation";
import { useCreateDeposit, useDeposits } from "../hooks/useFinance";
import {
  DEPOSIT_STATUSES,
  type Deposit,
  type DepositStatus,
  type FinanceListParams,
} from "../types/finance";
import type { DepositAction } from "../utils/actions";

const PAGE_SIZE = 20;

function isDepositStatus(value: string): value is DepositStatus {
  return DEPOSIT_STATUSES.some((status) => status === value);
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function DepositListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManage =
    user?.role === "OWNER" ||
    user?.role === "PROPERTY_MANAGER" ||
    user?.role === "ACCOUNTANT";
  const canSelectLease =
    user?.role === "OWNER" || user?.role === "PROPERTY_MANAGER";
  const search = searchParams.get("search") ?? "";
  const [searchValue, setSearchValue] = useState(search);
  const rawStatus = searchParams.get("status") ?? "";
  const status = isDepositStatus(rawStatus) ? rawStatus : "";
  const lease = searchParams.get("lease") ?? "";
  const tenant = searchParams.get("tenant") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const params: FinanceListParams = {
    search: search || undefined,
    status: status || undefined,
    lease: lease || undefined,
    tenant: tenant || undefined,
    page,
  };
  const query = useDeposits(params);
  const createMutation = useCreateDeposit();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [selectedAction, setSelectedAction] = useState<DepositAction | null>(null);

  const filters: FilterDefinition[] = [
    ...(canManage
      ? [
          {
            id: "lease",
            label: "Lease ID",
            type: "text" as const,
            value: lease,
            placeholder: "Filter by lease UUID",
          },
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
      id: "status",
      label: "Status",
      type: "status",
      value: status,
      options: DEPOSIT_STATUSES.map((value) => ({
        value,
        label: statusLabel(value),
      })),
    },
  ];

  const columns = useMemo<DataTableColumn<Deposit>[]>(
    () => [
      {
        id: "lease",
        header: "Lease",
        sortValue: (deposit) => deposit.lease,
        render: (deposit) => (
          <Link
            to={`/finance/deposits/${deposit.id}`}
            state={{ returnTo: `${location.pathname}${location.search}` }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            …{deposit.lease.slice(-8)}
          </Link>
        ),
      },
      {
        id: "required_amount",
        header: "Required amount",
        sortValue: (deposit) => Number(deposit.required_amount),
        render: (deposit) => String(deposit.required_amount),
      },
      {
        id: "paid_amount",
        header: "Paid amount",
        sortValue: (deposit) => Number(deposit.paid_amount),
        render: (deposit) => String(deposit.paid_amount),
      },
      {
        id: "payment_date",
        header: "Last payment date",
        sortValue: (deposit) => deposit.payment_date,
        render: (deposit) => formatDate(deposit.payment_date),
      },
      {
        id: "status",
        header: "Status",
        sortValue: (deposit) => deposit.status,
        render: (deposit) => <StatusBadge status={deposit.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        sortable: false,
        render: (deposit) => (
          <DepositActionsMenu
            deposit={deposit}
            onView={() =>
              navigate(`/finance/deposits/${deposit.id}`, {
                state: { returnTo: `${location.pathname}${location.search}` },
              })
            }
            onAction={(action) => {
              setSelectedDeposit(deposit);
              setSelectedAction(action);
            }}
          />
        ),
      },
    ],
    [location.pathname, location.search, navigate],
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
        title="Security deposits"
        subtitle="Record, refund, or forfeit lease deposits using backend rules."
        actions={
          canManage ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              Create deposit
            </Button>
          ) : undefined
        }
      />
      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearch={(value) => updateParam("search", value.trim())}
        searchLabel="Search deposits"
        filters={filters}
        onFilterChange={(id, value) => updateParam(id, value)}
        onReset={resetFilters}
      />
      {query.isError ? (
        <ErrorState
          title="Unable to load deposits"
          description={getFinanceErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Security deposits"
            columns={columns}
            data={query.data?.results ?? []}
            getRowId={(deposit) => deposit.id}
            loading={query.isLoading}
            emptyMessage={
              search || status || lease || tenant
                ? "No deposits match the selected filters."
                : "No security deposits are available."
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
      <DepositCreateModal
        open={createOpen}
        canSelectLease={canSelectLease}
        isSaving={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSave={(values) => createMutation.mutateAsync(values)}
        onSaved={() => toastService.success("Security deposit created.")}
      />
      <DepositWorkflowDialogs
        deposit={selectedDeposit}
        action={selectedAction}
        onClose={() => {
          setSelectedDeposit(null);
          setSelectedAction(null);
        }}
      />
    </div>
  );
}
