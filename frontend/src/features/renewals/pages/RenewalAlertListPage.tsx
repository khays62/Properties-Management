import { useCallback, useMemo } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import {
  DataTable,
  FilterBar,
  PageHeader,
  Pagination,
  type DataTableColumn,
  type FilterDefinition,
} from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { toastService } from "../../../services/toastService";
import { useLeasePropertyOptions } from "../../leases/hooks/useLeases";
import {
  getRenewalErrorMessage,
} from "../api/renewals.api";
import { RenewalAlertActionsMenu } from "../components/RenewalAlertActionsMenu";
import {
  useGenerateRenewalAlerts,
  useMarkRenewalAlertRead,
  useRenewalAlerts,
  useResolveRenewalAlert,
} from "../hooks/useRenewals";
import {
  RENEWAL_ALERT_STATUSES,
  type RenewalAlert,
  type RenewalAlertAction,
  type RenewalAlertQueryParams,
  type RenewalAlertStatus,
} from "../types/renewal";
import { isRenewalAlertStatus } from "../utils/actions";

const PAGE_SIZE = 20;

function formatStatus(status: RenewalAlertStatus): string {
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

export function RenewalAlertListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const canManage =
    user?.role === "OWNER" || user?.role === "PROPERTY_MANAGER";
  const rawStatus = searchParams.get("status") ?? "";
  const status: RenewalAlertStatus | "" = isRenewalAlertStatus(rawStatus)
    ? rawStatus
    : "";
  const lease = searchParams.get("lease") ?? "";
  const property = searchParams.get("property") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const params: RenewalAlertQueryParams = {
    status: status || undefined,
    lease: lease || undefined,
    property: property || undefined,
    page,
    page_size: PAGE_SIZE,
  };
  const alertsQuery = useRenewalAlerts(params);
  const propertyQuery = useLeasePropertyOptions(canManage);
  const generateMutation = useGenerateRenewalAlerts();
  const markReadMutation = useMarkRenewalAlertRead();
  const resolveMutation = useResolveRenewalAlert();
  const properties = useMemo(
    () => propertyQuery.data ?? [],
    [propertyQuery.data],
  );

  const filters: FilterDefinition[] = [
    {
      id: "status",
      label: "Status",
      type: "status",
      value: status,
      options: RENEWAL_ALERT_STATUSES.map((value) => ({
        value,
        label: formatStatus(value),
      })),
    },
    {
      id: "lease",
      label: "Tenant, unit, or property",
      type: "text",
      value: lease,
      placeholder: "Search lease details",
    },
    ...(canManage
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
        ]
      : []),
  ];

  const markAlertRead = markReadMutation.mutateAsync;
  const resolveAlert = resolveMutation.mutateAsync;
  const handleAlertAction = useCallback(
    async (alert: RenewalAlert, action: RenewalAlertAction) => {
      try {
        if (action === "mark-read") {
          await markAlertRead(alert.id);
          toastService.success("Renewal alert marked as read.");
        } else {
          await resolveAlert(alert.id);
          toastService.success("Renewal alert resolved.");
        }
      } catch (error) {
        toastService.error(getRenewalErrorMessage(error));
      }
    },
    [markAlertRead, resolveAlert],
  );

  const columns = useMemo<DataTableColumn<RenewalAlert>[]>(
    () => [
      {
        id: "alert_date",
        header: "Alert date",
        sortValue: (alert) => alert.alert_date,
        render: (alert) => formatDate(alert.alert_date),
      },
      {
        id: "lease",
        header: "Tenant and unit",
        sortValue: (alert) => alert.lease_label ?? "",
        render: (alert) => (
          <Link
            to={`/renewals/${alert.id}`}
            state={{ returnTo: `${location.pathname}${location.search}` }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            {alert.lease_label ?? "Lease details unavailable"}
          </Link>
        ),
      },
      {
        id: "days_before_expiry",
        header: "Days before expiry",
        sortValue: (alert) => alert.days_before_expiry,
        render: (alert) => `${alert.days_before_expiry} days`,
      },
      {
        id: "status",
        header: "Status",
        sortValue: (alert) => alert.status,
        render: (alert) => <StatusBadge status={alert.status} />,
      },
      ...(canManage
        ? [
            {
              id: "actions",
              header: "Actions",
              sortable: false,
              render: (alert: RenewalAlert) => (
                <RenewalAlertActionsMenu
                  alert={alert}
                  canManage={canManage}
                  isPending={
                    markReadMutation.isPending || resolveMutation.isPending
                  }
                  onAction={(action) => void handleAlertAction(alert, action)}
                />
              ),
            },
          ]
        : []),
    ],
    [
      canManage,
      handleAlertAction,
      location.pathname,
      location.search,
      markReadMutation.isPending,
      resolveMutation.isPending,
    ],
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
    setSearchParams({}, { replace: true });
  }

  async function generateAlerts() {
    try {
      const generated = await generateMutation.mutateAsync();
      if (generated.length === 0) {
        toastService.info("No new renewal alerts are due.");
      } else {
        toastService.success(
          `Generated ${generated.length} renewal alert${generated.length === 1 ? "" : "s"}.`,
        );
      }
    } catch (error) {
      toastService.error(getRenewalErrorMessage(error));
    }
  }

  const propertyError = canManage ? propertyQuery.error : null;

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Renewals"
        subtitle="Review lease expiry alerts and manage lease renewal workflows."
        actions={
          canManage ? (
            <Button
              type="button"
              onClick={() => void generateAlerts()}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending
                ? "Generating…"
                : "Generate alerts"}
            </Button>
          ) : undefined
        }
      />
      <FilterBar
        layout="toolbar"
        ariaLabel="Renewal alert filters"
        filters={filters}
        onFilterChange={(id, value) => updateParam(id, value)}
        onReset={resetFilters}
        resetDisabled={!status && !lease && !property}
      />
      {propertyError && (
        <ErrorState
          title="Unable to load property filters"
          description={getRenewalErrorMessage(propertyError)}
          onRetry={() => void propertyQuery.refetch()}
        />
      )}
      {alertsQuery.isError ? (
        <ErrorState
          title="Unable to load renewal alerts"
          description={getRenewalErrorMessage(alertsQuery.error)}
          onRetry={() => void alertsQuery.refetch()}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Renewal alerts"
            columns={columns}
            data={alertsQuery.data?.results ?? []}
            getRowId={(alert) => alert.id}
            loading={alertsQuery.isLoading}
            emptyMessage={
              status || lease || property
                ? "No renewal alerts match the selected filters."
                : "No renewal alerts are available."
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={alertsQuery.data?.count ?? 0}
            onPageChange={(nextPage) => updateParam("page", String(nextPage))}
          />
        </>
      )}
    </div>
  );
}
