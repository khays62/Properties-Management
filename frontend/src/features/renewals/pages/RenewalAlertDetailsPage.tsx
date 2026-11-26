import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { Breadcrumbs, PageHeader } from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { toastService } from "../../../services/toastService";
import { getLeaseErrorMessage } from "../../leases/api/leases.api";
import { LeaseRenewalModal } from "../../leases/components/LeaseRenewalModal";
import { useLease, useLeaseRenewal } from "../../leases/hooks/useLeases";
import type { LeaseRenewalInput } from "../../leases/types/lease";
import { getLeaseAvailableActions } from "../../leases/utils/transitions";
import { getListReturnPath } from "../../../utils/navigation";
import {
  getRenewalErrorMessage,
} from "../api/renewals.api";
import { RenewalAlertActionsMenu } from "../components/RenewalAlertActionsMenu";
import {
  useMarkRenewalAlertRead,
  useRenewalAlert,
  useResolveRenewalAlert,
} from "../hooks/useRenewals";
import type {
  RenewalAlertAction,
  RenewalAlertStatus,
} from "../types/renewal";

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

function formatStatus(status: RenewalAlertStatus): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

export function RenewalAlertDetailsPage() {
  const { alertId = "" } = useParams<{ alertId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage =
    user?.role === "OWNER" || user?.role === "PROPERTY_MANAGER";
  const alertQuery = useRenewalAlert(alertId);
  const alert = alertQuery.data;
  const leaseQuery = useLease(alert?.lease ?? "");
  const lease = leaseQuery.data;
  const [isRenewalOpen, setIsRenewalOpen] = useState(false);
  const markReadMutation = useMarkRenewalAlertRead();
  const resolveMutation = useResolveRenewalAlert();
  const renewalMutation = useLeaseRenewal();
  const listPath = getListReturnPath(
    location.state,
    "/renewals",
    "/renewals",
  );
  const canRenew =
    canManage &&
    lease !== undefined &&
    getLeaseAvailableActions(lease).includes("renew");

  async function handleAlertAction(action: RenewalAlertAction) {
    if (!alert) return;
    try {
      if (action === "mark-read") {
        await markReadMutation.mutateAsync(alert.id);
        toastService.success("Renewal alert marked as read.");
      } else {
        await resolveMutation.mutateAsync(alert.id);
        toastService.success("Renewal alert resolved.");
      }
    } catch (error) {
      toastService.error(getRenewalErrorMessage(error));
    }
  }

  async function submitRenewal(values: LeaseRenewalInput) {
    if (!lease) return;
    try {
      const successor = await renewalMutation.mutateAsync({
        id: lease.id,
        values,
      });
      toastService.success(
        "Successor lease created and submitted for approval.",
      );
      setIsRenewalOpen(false);
      navigate(`/leases/${successor.id}`, {
        state: { returnTo: "/leases?status=PENDING_APPROVAL" },
      });
    } catch (error) {
      toastService.error(getLeaseErrorMessage(error));
    }
  }

  if (alertQuery.isLoading) {
    return (
      <LoadingState
        label="Loading renewal alert"
        message="Loading renewal alert details…"
      />
    );
  }

  if (alertQuery.isError || !alert) {
    return (
      <div className="space-y-6 py-6">
        <Breadcrumbs
          items={[
            { label: "Renewals", href: listPath },
            { label: "Alert details", current: true },
          ]}
        />
        <ErrorState
          title="Unable to load renewal alert"
          description={
            alertQuery.error
              ? getRenewalErrorMessage(alertQuery.error)
              : "The renewal alert could not be found."
          }
          onRetry={() => void alertQuery.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <Breadcrumbs
        items={[
          { label: "Renewals", href: listPath },
          {
            label: `Alert ${alert.id.slice(0, 8).toUpperCase()}`,
            current: true,
          },
        ]}
      />
      <PageHeader
        title="Renewal alert"
        subtitle={`${alert.days_before_expiry}-day lease expiry reminder.`}
        actions={
          <>
            <RenewalAlertActionsMenu
              alert={alert}
              canManage={canManage}
              isPending={
                markReadMutation.isPending || resolveMutation.isPending
              }
              onAction={(action) => void handleAlertAction(action)}
            />
            {canRenew && (
              <Button
                type="button"
                onClick={() => setIsRenewalOpen(true)}
              >
                Renew lease
              </Button>
            )}
          </>
        }
      />

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            Alert information
          </h2>
          <StatusBadge status={alert.status} />
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-text-secondary">Alert date</dt>
            <dd className="mt-1 font-medium">{formatDate(alert.alert_date)}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Days before expiry</dt>
            <dd className="mt-1 font-medium">
              {alert.days_before_expiry} days
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Current status</dt>
            <dd className="mt-1 font-medium">
              {formatStatus(alert.status)}
            </dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-sm text-text-secondary">Lease</dt>
            <dd className="mt-1 break-all font-medium">
              <Link
                to={`/leases/${alert.lease}`}
                state={{ returnTo: "/leases" }}
                className="text-omni-blue hover:underline"
              >
                {alert.lease}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Created</dt>
            <dd className="mt-1 font-medium">
              {formatDateTime(alert.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Last updated</dt>
            <dd className="mt-1 font-medium">
              {formatDateTime(alert.updated_at)}
            </dd>
          </div>
        </dl>
      </Card>

      {leaseQuery.isLoading ? (
        <LoadingState
          label="Loading lease"
          message="Loading the lease associated with this alert…"
        />
      ) : leaseQuery.isError || !lease ? (
        <ErrorState
          title="Unable to load associated lease"
          description={
            leaseQuery.error
              ? getLeaseErrorMessage(leaseQuery.error)
              : "The associated lease could not be found."
          }
          onRetry={() => void leaseQuery.refetch()}
        />
      ) : (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text-primary">
              Lease renewal
            </h2>
            <StatusBadge status={lease.status} />
          </div>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-sm text-text-secondary">Lease ID</dt>
              <dd className="mt-1 break-all font-medium">{lease.id}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Tenant ID</dt>
              <dd className="mt-1 break-all font-medium">{lease.tenant}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Unit ID</dt>
              <dd className="mt-1 break-all font-medium">{lease.unit}</dd>
            </div>
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
          </dl>
          {canManage && lease.status === "PENDING_APPROVAL" && (
            <p className="text-sm text-text-secondary">
              This lease is awaiting approval. Review its approval and
              activation actions on the lease details page.
            </p>
          )}
        </Card>
      )}

      {lease && canRenew && (
        <LeaseRenewalModal
          open={isRenewalOpen}
          lease={lease}
          isSubmitting={renewalMutation.isPending}
          onClose={() => setIsRenewalOpen(false)}
          onSubmit={submitRenewal}
        />
      )}
    </div>
  );
}
