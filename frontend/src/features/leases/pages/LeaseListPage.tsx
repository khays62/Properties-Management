import { useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

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
import { getLeaseErrorMessage } from "../api/leases.api";
import {
  LeaseActionsMenu,
} from "../components/LeaseActionsMenu";
import { LeaseCreateModal } from "../components/LeaseCreateModal";
import { LeaseWorkflowDialogs } from "../components/LeaseWorkflowDialogs";
import {
  useCreateLease,
  useLeasePropertyOptions,
  useLeases,
  useLeaseUnitOptions,
} from "../hooks/useLeases";
import {
  LEASE_STATUSES,
  type LeaseAction,
  type LeaseDetails,
  type LeaseQueryParams,
  type LeaseStatus,
} from "../types/lease";

const PAGE_SIZE = 20;

function isLeaseStatus(value: string): value is LeaseStatus {
  return LEASE_STATUSES.some((status) => status === value);
}

function formatStatus(status: LeaseStatus): string {
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

function formatMoney(value: string | number): string {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function LeaseListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManageLeases =
    user?.role === "OWNER" || user?.role === "PROPERTY_MANAGER";
  const search = searchParams.get("search") ?? "";
  const [searchValue, setSearchValue] = useState(search);
  const rawStatus = searchParams.get("status") ?? "";
  const status = isLeaseStatus(rawStatus) ? rawStatus : "";
  const propertyId = searchParams.get("property") ?? "";
  const unitId = searchParams.get("unit") ?? "";
  const tenantId = searchParams.get("tenant") ?? "";
  const startDate = searchParams.get("start_date") ?? "";
  const endDate = searchParams.get("end_date") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const params: LeaseQueryParams = {
    search: search || undefined,
    status: status || undefined,
    property: propertyId || undefined,
    unit: unitId || undefined,
    tenant: tenantId || undefined,
    start_date: startDate || undefined,
    end_date: endDate || undefined,
    page,
  };
  const leasesQuery = useLeases(params);
  const propertiesQuery = useLeasePropertyOptions(canManageLeases);
  const unitsQuery = useLeaseUnitOptions(canManageLeases);
  const createLeaseMutation = useCreateLease();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [actionLease, setActionLease] = useState<LeaseDetails | null>(null);
  const [selectedAction, setSelectedAction] = useState<LeaseAction | null>(null);
  const properties = useMemo(
    () => propertiesQuery.data ?? [],
    [propertiesQuery.data],
  );
  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);
  const propertyById = useMemo(
    () => new Map(properties.map((property) => [property.id, property])),
    [properties],
  );
  const unitById = useMemo(
    () => new Map(units.map((unit) => [unit.id, unit])),
    [units],
  );

  const filters: FilterDefinition[] = [
    ...(canManageLeases
      ? [
          {
            id: "property",
            label: "Property",
            type: "select" as const,
            value: propertyId,
            options: properties.map((property) => ({
              value: property.id,
              label: `${property.name} (${property.code})`,
            })),
            placeholder: "All properties",
          },
          {
            id: "unit",
            label: "Unit",
            type: "select" as const,
            value: unitId,
            options: units.map((unit) => ({
              value: unit.id,
              label: unit.unit_number,
            })),
            placeholder: "All units",
          },
          {
            id: "tenant",
            label: "Tenant ID",
            type: "text" as const,
            value: tenantId,
            placeholder: "Filter by tenant ID",
          },
        ]
      : []),
    {
      id: "status",
      label: "Status",
      type: "status",
      value: status,
      options: LEASE_STATUSES.map((value) => ({
        value,
        label: formatStatus(value),
      })),
    },
    {
      id: "start_date",
      label: "Start date",
      type: "date",
      value: startDate,
    },
    {
      id: "end_date",
      label: "End date",
      type: "date",
      value: endDate,
    },
  ];

  const columns = useMemo<DataTableColumn<LeaseDetails>[]>(
    () => [
      {
        id: "lease",
        header: "Lease",
        sortValue: (lease) => lease.created_at,
        render: (lease) => (
          <Link
            to={`/leases/${lease.id}`}
            state={{ returnTo: `${location.pathname}${location.search}` }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            {lease.id.slice(0, 8).toUpperCase()}
          </Link>
        ),
      },
      {
        id: "tenant",
        header: "Tenant",
        sortValue: (lease) => lease.tenant,
        render: (lease) => `…${lease.tenant.slice(-8)}`,
      },
      {
        id: "property",
        header: "Property",
        sortValue: (lease) => {
          const unit = unitById.get(lease.unit);
          return unit
            ? propertyById.get(unit.property)?.name ?? unit.property
            : lease.unit;
        },
        render: (lease) => {
          const unit = unitById.get(lease.unit);
          return unit
            ? propertyById.get(unit.property)?.name ?? `…${unit.property.slice(-8)}`
            : "—";
        },
      },
      {
        id: "unit",
        header: "Unit",
        sortValue: (lease) => unitById.get(lease.unit)?.unit_number ?? lease.unit,
        render: (lease) =>
          unitById.get(lease.unit)?.unit_number ?? `…${lease.unit.slice(-8)}`,
      },
      {
        id: "monthly_rent",
        header: "Monthly rent",
        sortValue: (lease) => Number(lease.monthly_rent),
        render: (lease) => formatMoney(lease.monthly_rent),
      },
      {
        id: "term",
        header: "Lease term",
        sortValue: (lease) => lease.start_date,
        render: (lease) =>
          `${formatDate(lease.start_date)} – ${formatDate(lease.end_date)}`,
      },
      {
        id: "status",
        header: "Status",
        sortValue: (lease) => lease.status,
        render: (lease) => <StatusBadge status={lease.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        sortable: false,
        render: (lease) => (
          <LeaseActionsMenu
            lease={lease}
            onView={() =>
              navigate(`/leases/${lease.id}`, {
                state: { returnTo: `${location.pathname}${location.search}` },
              })
            }
            onAction={(action) => {
              setActionLease(lease);
              setSelectedAction(action);
            }}
          />
        ),
      },
    ],
    [location.pathname, location.search, navigate, propertyById, unitById],
  );

  function updateQueryParameter(name: string, value: string) {
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

  function handleFilterChange(filterId: string, value: string) {
    updateQueryParameter(filterId, value);
  }

  function resetFilters() {
    setSearchValue("");
    setSearchParams({}, { replace: true });
  }

  const filterError = canManageLeases
    ? propertiesQuery.error ?? unitsQuery.error
    : null;

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Leases"
        subtitle="Review lease terms, approvals, and occupancy status."
        actions={
          canManageLeases ? (
            <Button type="button" onClick={() => setIsCreateOpen(true)}>
              Create lease
            </Button>
          ) : undefined
        }
      />

      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearch={(value) => updateQueryParameter("search", value.trim())}
        searchLabel="Search leases"
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />

      {filterError && (
        <ErrorState
          title="Unable to load lease filters"
          description={getLeaseErrorMessage(filterError)}
          onRetry={() => {
            if (propertiesQuery.isError) void propertiesQuery.refetch();
            if (unitsQuery.isError) void unitsQuery.refetch();
          }}
        />
      )}

      {leasesQuery.isError ? (
        <ErrorState
          title="Unable to load leases"
          description={getLeaseErrorMessage(leasesQuery.error)}
          onRetry={() => void leasesQuery.refetch()}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Leases"
            columns={columns}
            data={leasesQuery.data?.results ?? []}
            getRowId={(lease) => lease.id}
            loading={leasesQuery.isLoading}
            emptyMessage={
              search ||
              status ||
              propertyId ||
              unitId ||
              tenantId ||
              startDate ||
              endDate
                ? "No leases match the selected filters."
                : "No leases are available."
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={leasesQuery.data?.count ?? 0}
            onPageChange={(nextPage) =>
              updateQueryParameter("page", String(nextPage))
            }
          />
        </>
      )}

      <LeaseCreateModal
        open={isCreateOpen}
        isSaving={createLeaseMutation.isPending}
        onClose={() => setIsCreateOpen(false)}
        onSave={(values) => createLeaseMutation.mutateAsync(values)}
        onSaved={() => toastService.success("Draft lease created and invitation sent.")}
      />
      <LeaseWorkflowDialogs
        lease={actionLease}
        action={selectedAction}
        onClose={() => {
          setActionLease(null);
          setSelectedAction(null);
        }}
      />
    </div>
  );
}
