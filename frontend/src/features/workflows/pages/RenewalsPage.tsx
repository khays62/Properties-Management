import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../hooks/useAuth";
import {
  fetchWorkflowRecords,
  getRecordText,
  postWorkflowAction,
  type WorkflowRecord,
} from "../api";
import { WorkflowAction } from "../components/WorkflowAction";
import { WorkflowForm } from "../components/WorkflowForm";
import { WorkflowPage } from "../components/WorkflowPage";
import { WorkflowRecords } from "../components/WorkflowRecords";

const renewalColumns = [
  { key: "lease", label: "Lease ID" },
  { key: "days_before_expiry", label: "Days before expiry" },
  { key: "alert_date", label: "Alert date" },
  { key: "status", label: "Status" },
];

function renewalActions(record: WorkflowRecord) {
  const status = getRecordText(record, "status");
  if (status === "UNREAD") {
    return (
      <WorkflowAction
        label="Mark read"
        onAction={() =>
          postWorkflowAction(`renewal-alerts/${record.id}/mark-read/`)
        }
      />
    );
  }
  if (status === "READ") {
    return (
      <WorkflowAction
        label="Resolve alert"
        onAction={() =>
          postWorkflowAction(`renewal-alerts/${record.id}/resolve/`)
        }
      />
    );
  }
  return null;
}

export function RenewalsPage() {
  const { user } = useAuth();
  const isManager = ["OWNER", "PROPERTY_MANAGER"].includes(user?.role ?? "");
  const leases = useQuery({
    queryKey: ["workflow", "leases"],
    queryFn: () => fetchWorkflowRecords("leases/"),
    enabled: isManager,
  });

  return (
    <WorkflowPage
      title="Renewals"
      subtitle="Generate renewal alerts, track responses, and prepare successor leases."
    >
      {isManager && (
        <div className="space-y-5">
          <WorkflowAction
            label="Generate renewal alerts"
            onAction={() => postWorkflowAction("renewal-alerts/generate/")}
          />
          <WorkflowForm
            title="Renew a lease"
            fields={[
              {
                name: "lease",
                label: "Expiring lease",
                type: "select",
                required: true,
                options: (leases.data ?? [])
                  .filter((lease) =>
                    ["ACTIVE", "EXPIRING"].includes(
                      getRecordText(lease, "status"),
                    ),
                  )
                  .map((lease) => ({
                    value: lease.id,
                    label: `${getRecordText(lease, "tenant")} — ${lease.id.slice(0, 8)}`,
                  })),
              },
              {
                name: "new_end_date",
                label: "New lease end date",
                type: "date",
                required: true,
              },
            ]}
            onSubmit={(values) => {
              const { lease, new_end_date } = values;
              return postWorkflowAction(`leases/${lease}/renew/`, {
                new_end_date,
              });
            }}
          />
        </div>
      )}
      {!isManager && (
        <p className="text-sm text-text-secondary">
          Renewal alerts are read-only for tenant accounts.
        </p>
      )}
      <WorkflowRecords
        title="Renewal alerts"
        path="renewal-alerts/"
        queryName="renewal-alerts"
        columns={renewalColumns}
        actions={isManager ? renewalActions : undefined}
        emptyMessage="No renewal alerts are available."
      />
    </WorkflowPage>
  );
}
