import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { Breadcrumbs, PageHeader } from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { getListReturnPath } from "../../../utils/navigation";
import { getLeaseErrorMessage } from "../api/leases.api";
import { LeaseActionsMenu } from "../components/LeaseActionsMenu";
import { LeaseWorkflowDialogs } from "../components/LeaseWorkflowDialogs";
import { useLease, useLeasePropertyOptions, useLeaseUnitOptions } from "../hooks/useLeases";
import type { LeaseAction, LeaseDetails } from "../types/lease";

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
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

function displayIdentifier(value: string): string {
  return value;
}

export function LeaseDetailsPage() {
  const { leaseId = "" } = useParams<{ leaseId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const canManageLeases =
    user?.role === "OWNER" || user?.role === "PROPERTY_MANAGER";
  const leaseQuery = useLease(leaseId);
  const lease = leaseQuery.data;
  const propertiesQuery = useLeasePropertyOptions(canManageLeases);
  const unitsQuery = useLeaseUnitOptions(canManageLeases);
  const [actionLease, setActionLease] = useState<LeaseDetails | null>(null);
  const [selectedAction, setSelectedAction] = useState<LeaseAction | null>(null);
  const listPath = getListReturnPath(
    location.state,
    "/leases",
    "/leases",
  );
  const unitById = useMemo(
    () => new Map((unitsQuery.data ?? []).map((unit) => [unit.id, unit])),
    [unitsQuery.data],
  );
  const propertyById = useMemo(
    () =>
      new Map((propertiesQuery.data ?? []).map((property) => [property.id, property])),
    [propertiesQuery.data],
  );

  function breadcrumbs(leaseLabel: string) {
    return (
      <Breadcrumbs
        items={[
          { label: "Leases", href: listPath },
          { label: leaseLabel, current: true },
        ]}
      />
    );
  }

  if (leaseQuery.isLoading) {
    return (
      <LoadingState label="Loading lease" message="Loading lease details…" />
    );
  }

  if (leaseQuery.isError || !lease) {
    return (
      <div className="space-y-4 py-6">
        {breadcrumbs("Lease details")}
        <ErrorState
          title="Unable to load lease"
          description={
            leaseQuery.error
              ? getLeaseErrorMessage(leaseQuery.error)
              : "The lease could not be found."
          }
          onRetry={() => void leaseQuery.refetch()}
        />
      </div>
    );
  }

  const unit = canManageLeases ? unitById.get(lease.unit) : undefined;
  const property = unit ? propertyById.get(unit.property) : undefined;

  return (
    <div className="space-y-6 py-6">
      {breadcrumbs(`Lease ${lease.id.slice(0, 8).toUpperCase()}`)}
      <PageHeader
        title={`Lease ${lease.id.slice(0, 8).toUpperCase()}`}
        subtitle="Contract terms, approval history, and lease status."
        actions={
          canManageLeases ? (
            <LeaseActionsMenu
              lease={lease}
              onAction={(action) => {
                setActionLease(lease);
                setSelectedAction(action);
              }}
            />
          ) : undefined
        }
      />

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            Lease information
          </h2>
          <StatusBadge status={lease.status} />
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-text-secondary">Tenant</dt>
            <dd className="mt-1 break-all font-medium">
              {displayIdentifier(lease.tenant)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Application</dt>
            <dd className="mt-1 break-all font-medium">
              {displayIdentifier(lease.application)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Unit</dt>
            <dd className="mt-1 font-medium">
              {unit ? `${unit.unit_number} · ${unit.status}` : lease.unit}
            </dd>
          </div>
          {canManageLeases && (
            <div>
              <dt className="text-sm text-text-secondary">Property</dt>
              <dd className="mt-1 font-medium">
                {property ? `${property.name} (${property.code})` : unit?.property ?? "—"}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-text-secondary">Lease period</dt>
            <dd className="mt-1 font-medium">
              {formatDate(lease.start_date)} – {formatDate(lease.end_date)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Monthly rent</dt>
            <dd className="mt-1 font-medium">
              {formatMoney(lease.monthly_rent)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Security deposit</dt>
            <dd className="mt-1 font-medium">
              {formatMoney(lease.deposit_amount)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Payment due day</dt>
            <dd className="mt-1 font-medium">{lease.payment_due_day}</dd>
          </div>
          {lease.approved_at && (
            <div>
              <dt className="text-sm text-text-secondary">Approved</dt>
              <dd className="mt-1 font-medium">
                {formatDateTime(lease.approved_at)}
              </dd>
            </div>
          )}
          {lease.approved_by && (
            <div>
              <dt className="text-sm text-text-secondary">Approved by</dt>
              <dd className="mt-1 break-all font-medium">
                {lease.approved_by}
              </dd>
            </div>
          )}
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-sm text-text-secondary">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap">
              {lease.notes || "No notes provided."}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-text-primary">
            Status history
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Status changes recorded by the lease workflow.
          </p>
        </div>
        {lease.status_history.length > 0 ? (
          <ol className="space-y-4">
            {lease.status_history.map((event) => (
              <li
                key={event.id}
                className="border-l-2 border-[var(--color-border)] pl-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {event.old_status && (
                    <>
                      <StatusBadge status={event.old_status} />
                      <span aria-hidden="true" className="text-text-secondary">
                        →
                      </span>
                    </>
                  )}
                  <StatusBadge status={event.new_status} />
                  <time
                    className="text-sm text-text-secondary"
                    dateTime={event.created_at}
                  >
                    {formatDateTime(event.created_at)}
                  </time>
                </div>
                <p className="mt-2 text-sm text-text-primary">
                  {event.change_reason}
                </p>
                {event.changed_by && (
                  <p className="mt-1 break-all text-xs text-text-secondary">
                    Changed by {event.changed_by}
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-text-secondary">
            No status history is available.
          </p>
        )}
      </Card>

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
