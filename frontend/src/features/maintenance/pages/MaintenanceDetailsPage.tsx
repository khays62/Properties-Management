import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { Breadcrumbs, PageHeader } from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { useProperty } from "../../properties/hooks/useProperties";
import { useUnit } from "../../units/hooks/useUnits";
import { getListReturnPath } from "../../../utils/navigation";
import { getMaintenanceErrorMessage } from "../api/maintenance.api";
import { MaintenanceActionsMenu } from "../components/MaintenanceActionsMenu";
import { MaintenanceWorkflowDialogs } from "../components/MaintenanceWorkflowDialogs";
import { useMaintenanceTicket } from "../hooks/useMaintenance";
import type { MaintenanceAction } from "../types/maintenance";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

function humanize(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function MaintenanceDetailsPage() {
  const { ticketId = "" } = useParams<{ ticketId: string }>();
  const location = useLocation();
  const { user } = useAuth();
  const isManager =
    user?.role === "OWNER" || user?.role === "PROPERTY_MANAGER";
  const query = useMaintenanceTicket(ticketId);
  const ticket = query.data;
  const unitQuery = useUnit(isManager ? ticket?.unit ?? "" : "");
  const unit = unitQuery.data;
  const propertyQuery = useProperty(isManager ? unit?.property ?? "" : "");
  const property = propertyQuery.data;
  const [action, setAction] = useState<MaintenanceAction | null>(null);
  const listPath = getListReturnPath(
    location.state,
    "/maintenance",
    "/maintenance",
  );
  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: "Maintenance", href: listPath },
        { label: ticket?.title ?? "Ticket details", current: true },
      ]}
    />
  );
  const unitLabel = useMemo(() => {
    if (!ticket) return "—";
    const number = ticket.unit_number ?? unit?.unit_number;
    const status = ticket.unit_status ?? unit?.status;
    if (!number) return "Unit details unavailable";
    return `Unit ${number}${status ? ` (${humanize(status)})` : ""}`;
  }, [ticket, unit]);

  if (query.isLoading) {
    return (
      <div className="space-y-6 py-6">
        {breadcrumbs}
        <LoadingState
          label="Loading maintenance ticket"
          message="Loading ticket details…"
        />
      </div>
    );
  }

  if (query.isError || !ticket) {
    return (
      <div className="space-y-6 py-6">
        {breadcrumbs}
        <ErrorState
          title="Unable to load maintenance ticket"
          description={
            query.error
              ? getMaintenanceErrorMessage(query.error)
              : "The maintenance ticket could not be found."
          }
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  const actionsTicket = ticket;
  const attachmentURL = (file: string) => {
    if (/^https?:\/\//i.test(file)) return file;
    return new URL(file, import.meta.env.VITE_API_BASE_URL).toString();
  };

  return (
    <div className="space-y-6 py-6">
      {breadcrumbs}
      <PageHeader
        title={ticket.title}
        subtitle={`${unitLabel}${ticket.property_name ? ` · ${ticket.property_name}` : ""}`}
        actions={
          <MaintenanceActionsMenu
            ticket={ticket}
            isManager={isManager}
            onAction={setAction}
          />
        }
      />
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            Request details
          </h2>
          <StatusBadge status={ticket.status} />
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-text-secondary">Category</dt>
            <dd className="mt-1 font-medium">{humanize(ticket.category)}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Priority</dt>
            <dd className="mt-1">
              <StatusBadge status={ticket.priority} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Unit</dt>
            <dd className="mt-1 font-medium">{unitLabel}</dd>
          </div>
          {isManager && (
            <div>
              <dt className="text-sm text-text-secondary">Property</dt>
              <dd className="mt-1 font-medium">
                {property
                  ? `${property.name} (${property.code})`
                  : ticket.property_name
                    ? `${ticket.property_name}${ticket.property_code ? ` (${ticket.property_code})` : ""}`
                    : "Property details unavailable"}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-text-secondary">Tenant</dt>
            <dd className="mt-1 font-medium">
              {ticket.tenant_name || ticket.tenant_email || "Tenant details unavailable"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Assigned manager</dt>
            <dd className="mt-1 font-medium">
              {ticket.assigned_to_name ?? "Not assigned"}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Created</dt>
            <dd className="mt-1 font-medium">
              {formatDateTime(ticket.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Last updated</dt>
            <dd className="mt-1 font-medium">
              {formatDateTime(ticket.updated_at)}
            </dd>
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-sm text-text-secondary">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap">{ticket.description}</dd>
          </div>
          {ticket.resolution_notes && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-sm text-text-secondary">
                Resolution notes
              </dt>
              <dd className="mt-1 whitespace-pre-wrap">
                {ticket.resolution_notes}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Activity history
          </h2>
          <p className="text-sm text-text-secondary">
            Actions recorded by the maintenance workflow.
          </p>
        </div>
        <Card>
          {ticket.activities.length > 0 ? (
            <ol className="space-y-4">
              {ticket.activities.map((activity) => (
                <li
                  key={activity.id}
                  className="border-l-2 border-[var(--color-border)] pl-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={activity.action} />
                    <time
                      className="text-sm text-text-secondary"
                      dateTime={activity.created_at}
                    >
                      {formatDateTime(activity.created_at)}
                    </time>
                  </div>
                  {activity.notes && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-text-primary">
                      {activity.notes}
                    </p>
                  )}
                  {activity.performed_by && (
                    <p className="mt-1 text-xs text-text-secondary">
                      Performed by {activity.performed_by_name ?? "a team member"}
                    </p>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-text-secondary">
              No activity has been recorded.
            </p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Attachments
          </h2>
          <p className="text-sm text-text-secondary">
            Files attached to this ticket.
          </p>
        </div>
        <Card>
          {ticket.attachments.length > 0 ? (
            <ul className="space-y-3">
              {ticket.attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <a
                    href={attachmentURL(attachment.file)}
                    target="_blank"
                    rel="noreferrer"
                    className="break-all font-medium text-omni-blue hover:underline"
                  >
                    {attachment.file.split("/").pop() || "Open attachment"}
                  </a>
                  <time
                    className="text-sm text-text-secondary"
                    dateTime={attachment.uploaded_at}
                  >
                    {formatDateTime(attachment.uploaded_at)}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">
              No attachments have been uploaded.
            </p>
          )}
        </Card>
      </section>

      <MaintenanceWorkflowDialogs
        ticket={actionsTicket}
        action={action}
        onClose={() => setAction(null)}
      />
    </div>
  );
}
