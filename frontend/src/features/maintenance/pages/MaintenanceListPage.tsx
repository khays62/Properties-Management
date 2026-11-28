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
import { getMaintenanceErrorMessage } from "../api/maintenance.api";
import { MaintenanceActionsMenu } from "../components/MaintenanceActionsMenu";
import { MaintenanceCreateModal } from "../components/MaintenanceCreateModal";
import { MaintenanceWorkflowDialogs } from "../components/MaintenanceWorkflowDialogs";
import {
  useCreateMaintenanceTicket,
  useMaintenanceProperties,
  useMaintenanceTenants,
  useMaintenanceTickets,
  useMaintenanceUnits,
} from "../hooks/useMaintenance";
import {
  MAINTENANCE_CATEGORIES,
  MAINTENANCE_PRIORITIES,
  MAINTENANCE_STATUSES,
  type MaintenanceAction,
  type MaintenanceCategory,
  type MaintenancePriority,
  type MaintenanceQueryParams,
  type MaintenanceStatus,
  type MaintenanceTicket,
} from "../types/maintenance";
import { isMaintenanceStatus } from "../utils/workflow";

const PAGE_SIZE = 20;

function isPriority(value: string): value is MaintenancePriority {
  return MAINTENANCE_PRIORITIES.some((priority) => priority === value);
}

function isCategory(value: string): value is MaintenanceCategory {
  return MAINTENANCE_CATEGORIES.some((category) => category === value);
}

function label(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function MaintenanceListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isManager =
    user?.role === "OWNER" || user?.role === "PROPERTY_MANAGER";
  const search = searchParams.get("search") ?? "";
  const [searchValue, setSearchValue] = useState(search);
  const rawStatus = searchParams.get("status") ?? "";
  const status: MaintenanceStatus | "" = isMaintenanceStatus(rawStatus)
    ? rawStatus
    : "";
  const rawPriority = searchParams.get("priority") ?? "";
  const priority = isPriority(rawPriority) ? rawPriority : "";
  const rawCategory = searchParams.get("category") ?? "";
  const category = isCategory(rawCategory) ? rawCategory : "";
  const property = searchParams.get("property") ?? "";
  const unit = searchParams.get("unit") ?? "";
  const tenant = searchParams.get("tenant") ?? "";
  const assignedTo = searchParams.get("assigned_to") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const params: MaintenanceQueryParams = {
    search: search || undefined,
    status: status || undefined,
    priority: priority || undefined,
    category: category || undefined,
    property: property || undefined,
    unit: unit || undefined,
    tenant: tenant || undefined,
    assigned_to: assignedTo || undefined,
    page,
  };
  const query = useMaintenanceTickets(params);
  const propertiesQuery = useMaintenanceProperties(isManager);
  const tenantsQuery = useMaintenanceTenants(isManager);
  const unitsQuery = useMaintenanceUnits(isManager);
  const createMutation = useCreateMaintenanceTicket();
  const [createOpen, setCreateOpen] = useState(false);
  const [actionTicket, setActionTicket] = useState<MaintenanceTicket | null>(
    null,
  );
  const [action, setAction] = useState<MaintenanceAction | null>(null);
  const properties = useMemo(
    () => propertiesQuery.data ?? [],
    [propertiesQuery.data],
  );
  const units = useMemo(() => unitsQuery.data ?? [], [unitsQuery.data]);
  const propertyById = useMemo(
    () => new Map(properties.map((item) => [item.id, item])),
    [properties],
  );
  const unitById = useMemo(
    () => new Map(units.map((item) => [item.id, item])),
    [units],
  );

  const filters: FilterDefinition[] = [
    {
      id: "status",
      label: "Status",
      type: "status",
      value: status,
      options: MAINTENANCE_STATUSES.map((value) => ({
        value,
        label: label(value),
      })),
    },
    {
      id: "priority",
      label: "Priority",
      type: "select",
      value: priority,
      options: MAINTENANCE_PRIORITIES.map((value) => ({
        value,
        label: label(value),
      })),
    },
    {
      id: "category",
      label: "Category",
      type: "select",
      value: category,
      options: MAINTENANCE_CATEGORIES.map((value) => ({
        value,
        label: label(value),
      })),
    },
    ...(isManager
      ? [
          {
            id: "property",
            label: "Property",
            type: "select" as const,
            value: property,
            options: properties.map((item) => ({
              value: item.id,
              label: `${item.name} (${item.code})`,
            })),
            placeholder: "All properties",
          },
          {
            id: "unit",
            label: "Unit",
            type: "select" as const,
            value: unit,
            options: units.map((item) => ({
              value: item.id,
              label: `${item.unit_number} · ${propertyById.get(item.property)?.name ?? "Property"}`,
            })),
            placeholder: "All units",
          },
          {
            id: "tenant",
            label: "Tenant",
            type: "select" as const,
            value: tenant,
            options: (tenantsQuery.data ?? []).map((item) => ({
              value: item.id,
              label: item.user_name || item.user_email || "Tenant",
            })),
            placeholder: "All tenants",
          },
          {
            id: "assigned_to",
            label: "Assigned manager",
            type: "text" as const,
            value: assignedTo,
            placeholder: "Name or email",
          },
        ]
      : []),
  ];

  const columns = useMemo<DataTableColumn<MaintenanceTicket>[]>(
    () => [
      {
        id: "title",
        header: "Ticket",
        sortValue: (ticket) => ticket.title,
        render: (ticket) => (
          <Link
            to={`/maintenance/${ticket.id}`}
            state={{ returnTo: `${location.pathname}${location.search}` }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            {ticket.title}
          </Link>
        ),
      },
      {
        id: "unit",
        header: "Unit",
        sortValue: (ticket) =>
          ticket.unit_number ?? unitById.get(ticket.unit)?.unit_number ?? "",
        render: (ticket) =>
          ticket.unit_number ??
          unitById.get(ticket.unit)?.unit_number ??
          "Unit details unavailable",
      },
      ...(isManager
        ? [
            {
              id: "property",
              header: "Property",
              sortValue: (ticket: MaintenanceTicket) => {
                const ticketUnit = unitById.get(ticket.unit);
                return ticketUnit
                  ? propertyById.get(ticketUnit.property)?.name ??
                      ticket.property_name ??
                      ""
                  : ticket.property_name ?? "";
              },
              render: (ticket: MaintenanceTicket) => {
                const ticketUnit = unitById.get(ticket.unit);
                return ticketUnit
                  ? propertyById.get(ticketUnit.property)?.name ??
                      ticket.property_name ??
                      "Property details unavailable"
                  : ticket.property_name ?? "Property details unavailable";
              },
            },
          ]
        : []),
      {
        id: "category",
        header: "Category",
        sortValue: (ticket) => ticket.category,
        render: (ticket) => label(ticket.category),
      },
      {
        id: "priority",
        header: "Priority",
        sortValue: (ticket) => ticket.priority,
        render: (ticket) => <StatusBadge status={ticket.priority} />,
      },
      {
        id: "status",
        header: "Status",
        sortValue: (ticket) => ticket.status,
        render: (ticket) => <StatusBadge status={ticket.status} />,
      },
      {
        id: "created_at",
        header: "Submitted",
        sortValue: (ticket) => ticket.created_at,
        render: (ticket) => formatDate(ticket.created_at),
      },
      {
        id: "actions",
        header: "Actions",
        sortable: false,
        render: (ticket) => (
          <MaintenanceActionsMenu
            ticket={ticket}
            isManager={isManager}
            onView={() =>
              navigate(`/maintenance/${ticket.id}`, {
                state: { returnTo: `${location.pathname}${location.search}` },
              })
            }
            onAction={(nextAction) => {
              setActionTicket(ticket);
              setAction(nextAction);
            }}
          />
        ),
      },
    ],
    [isManager, location.pathname, location.search, navigate, propertyById, unitById],
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

  const filterError = isManager
    ? propertiesQuery.error ?? unitsQuery.error ?? tenantsQuery.error
    : null;

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Maintenance"
        subtitle="Submit, assign, track, and resolve property maintenance requests."
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            Create ticket
          </Button>
        }
      />
      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearch={(value) => updateParam("search", value.trim())}
        searchLabel="Search maintenance tickets"
        filters={filters}
        onFilterChange={(id, value) => updateParam(id, value)}
        onReset={resetFilters}
      />
      {filterError && (
        <ErrorState
          title="Unable to load maintenance filters"
          description={getMaintenanceErrorMessage(filterError)}
          onRetry={() => {
            if (propertiesQuery.isError) void propertiesQuery.refetch();
            if (unitsQuery.isError) void unitsQuery.refetch();
            if (tenantsQuery.isError) void tenantsQuery.refetch();
          }}
        />
      )}
      {query.isError ? (
        <ErrorState
          title="Unable to load maintenance tickets"
          description={getMaintenanceErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Maintenance tickets"
            columns={columns}
            data={query.data?.results ?? []}
            getRowId={(ticket) => ticket.id}
            loading={query.isLoading}
            emptyMessage={
              search ||
              status ||
              priority ||
              category ||
              property ||
              unit ||
              tenant ||
              assignedTo
                ? "No maintenance tickets match the selected filters."
                : "No maintenance tickets have been submitted."
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
      <MaintenanceCreateModal
        open={createOpen}
        isSaving={createMutation.isPending}
        onClose={() => setCreateOpen(false)}
        onSave={(values) => createMutation.mutateAsync(values)}
        onSaved={() => toastService.success("Maintenance ticket created.")}
      />
      <MaintenanceWorkflowDialogs
        ticket={actionTicket}
        action={action}
        onClose={() => {
          setActionTicket(null);
          setAction(null);
        }}
      />
    </div>
  );
}
