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
import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { toastService } from "../../../services/toastService";
import { getFinanceErrorMessage } from "../api/finance.api";
import { FinanceNavigation } from "../components/FinanceNavigation";
import { RentChargeGenerateModal } from "../components/RentChargeGenerateModal";
import {
  useAllRentSchedules,
  useGenerateRentCharges,
  useRentCharges,
} from "../hooks/useFinance";
import {
  RENT_CHARGE_STATUSES,
  type RentCharge,
  type RentChargeQueryParams,
  type RentChargeStatus,
} from "../types/finance";

const PAGE_SIZE = 20;

function isRentChargeStatus(value: string): value is RentChargeStatus {
  return RENT_CHARGE_STATUSES.some((status) => status === value);
}

function statusLabel(status: string): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function ChargeListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManage =
    user?.role === "OWNER" ||
    user?.role === "PROPERTY_MANAGER" ||
    user?.role === "ACCOUNTANT";
  const search = searchParams.get("search") ?? "";
  const [searchValue, setSearchValue] = useState(search);
  const rawStatus = searchParams.get("status") ?? "";
  const status = isRentChargeStatus(rawStatus) ? rawStatus : "";
  const tenant = searchParams.get("tenant") ?? "";
  const lease = searchParams.get("lease") ?? "";
  const monthText = searchParams.get("billing_month") ?? "";
  const yearText = searchParams.get("billing_year") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const monthValue = Number(monthText);
  const yearValue = Number(yearText);
  const params: RentChargeQueryParams = {
    search: search || undefined,
    status: status || undefined,
    tenant: tenant || undefined,
    lease: lease || undefined,
    billing_month:
      Number.isInteger(monthValue) && monthValue >= 1 && monthValue <= 12
        ? monthValue
        : undefined,
    billing_year:
      Number.isInteger(yearValue) && yearValue >= 1
        ? yearValue
        : undefined,
    page,
  };
  const chargesQuery = useRentCharges(params);
  const schedulesQuery = useAllRentSchedules(canManage);
  const generateMutation = useGenerateRentCharges();
  const [generateOpen, setGenerateOpen] = useState(false);

  const filters: FilterDefinition[] = [
    ...(canManage
      ? [
          {
            id: "tenant",
            label: "Tenant ID",
            type: "text" as const,
            value: tenant,
            placeholder: "Filter by tenant UUID",
          },
          {
            id: "lease",
            label: "Lease ID",
            type: "text" as const,
            value: lease,
            placeholder: "Filter by lease UUID",
          },
        ]
      : []),
    {
      id: "status",
      label: "Status",
      type: "status",
      value: status,
      options: RENT_CHARGE_STATUSES.map((value) => ({
        value,
        label: statusLabel(value),
      })),
    },
    {
      id: "billing_month",
      label: "Billing month",
      type: "text",
      value: monthText,
      placeholder: "1–12",
    },
    {
      id: "billing_year",
      label: "Billing year",
      type: "text",
      value: yearText,
      placeholder: "YYYY",
    },
  ];

  const columns = useMemo<DataTableColumn<RentCharge>[]>(
    () => [
      {
        id: "billing_period",
        header: "Billing period",
        sortValue: (charge) =>
          charge.billing_year * 100 + charge.billing_month,
        render: (charge) => `${charge.billing_month}/${charge.billing_year}`,
      },
      {
        id: "tenant",
        header: "Tenant ID",
        sortValue: (charge) => charge.tenant,
        render: (charge) => `…${charge.tenant.slice(-8)}`,
      },
      {
        id: "lease",
        header: "Lease ID",
        sortValue: (charge) => charge.lease,
        render: (charge) => `…${charge.lease.slice(-8)}`,
      },
      {
        id: "amount",
        header: "Charge amount",
        sortValue: (charge) => Number(charge.amount),
        render: (charge) => String(charge.amount),
      },
      {
        id: "balance",
        header: "Balance",
        sortValue: (charge) => Number(charge.balance),
        render: (charge) => String(charge.balance),
      },
      {
        id: "due_date",
        header: "Due date",
        sortValue: (charge) => charge.due_date,
        render: (charge) => formatDate(charge.due_date),
      },
      {
        id: "status",
        header: "Status",
        sortValue: (charge) => charge.status,
        render: (charge) => <StatusBadge status={charge.status} />,
      },
      {
        id: "details",
        header: "Details",
        sortable: false,
        render: (charge) => (
          <Link
            to={`/finance/charges/${charge.id}`}
            state={{ returnTo: `${location.pathname}${location.search}` }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            View charge
          </Link>
        ),
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
        title="Rent charges"
        subtitle="Review backend-generated rent charges, balances, and due dates."
        actions={
          canManage ? (
            <Button type="button" onClick={() => setGenerateOpen(true)}>
              Generate monthly charges
            </Button>
          ) : undefined
        }
      />
      <p className="text-sm text-text-secondary">
        Invoices can be issued from a charge. Invoice list and detail views are
        unavailable because the backend does not currently expose invoice
        retrieval endpoints.
      </p>
      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearch={(value) => updateParam("search", value.trim())}
        searchLabel="Search rent charges"
        filters={filters}
        onFilterChange={(id, value) => updateParam(id, value)}
        onReset={resetFilters}
      />
      {schedulesQuery.isError && (
        <ErrorState
          title="Unable to check rent schedules"
          description={getFinanceErrorMessage(schedulesQuery.error)}
          onRetry={() => void schedulesQuery.refetch()}
        />
      )}
      {canManage &&
        schedulesQuery.isSuccess &&
        !schedulesQuery.data.some((schedule) => schedule.is_active) && (
          <EmptyState
            title="No active rent schedules"
            description="Create a rent schedule first before generating rent charges."
            action={
              <Link
                to="/finance/rent-schedules"
                className="op-button op-button--primary op-button--md"
              >
                Manage rent schedules
              </Link>
            }
          />
        )}
      {chargesQuery.isError ? (
        <ErrorState
          title="Unable to load rent charges"
          description={getFinanceErrorMessage(chargesQuery.error)}
          onRetry={() => void chargesQuery.refetch()}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Rent charges"
            columns={columns}
            data={chargesQuery.data?.results ?? []}
            getRowId={(charge) => charge.id}
            loading={chargesQuery.isLoading}
            emptyMessage={
              search || status || tenant || lease || monthText || yearText
                ? "No rent charges match the selected filters."
                : "No rent charges are available."
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={chargesQuery.data?.count ?? 0}
            onPageChange={(nextPage) => updateParam("page", String(nextPage))}
          />
        </>
      )}
      <RentChargeGenerateModal
        open={generateOpen}
        isSaving={generateMutation.isPending}
        onClose={() => setGenerateOpen(false)}
        onSave={(values) => generateMutation.mutateAsync(values)}
        onSaved={() =>
          toastService.success("Monthly rent charge generation completed.")
        }
      />
    </div>
  );
}
