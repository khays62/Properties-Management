import { useQuery } from "@tanstack/react-query";

import {
  createWorkflowRecord,
  fetchWorkflowRecords,
  getRecordText,
  postWorkflowAction,
  type WorkflowRecord,
} from "../api";
import { WorkflowAction } from "../components/WorkflowAction";
import { WorkflowForm } from "../components/WorkflowForm";
import { WorkflowPage } from "../components/WorkflowPage";
import { WorkflowRecords } from "../components/WorkflowRecords";

const leaseColumns = [
  { key: "tenant", label: "Tenant ID" },
  { key: "unit", label: "Unit ID" },
  { key: "start_date", label: "Start date" },
  { key: "end_date", label: "End date" },
  { key: "monthly_rent", label: "Rent" },
  { key: "status", label: "Status" },
];

function leaseActions(record: WorkflowRecord) {
  const status = getRecordText(record, "status");
  const action =
    status === "DRAFT"
      ? "submit-for-approval"
      : status === "PENDING_APPROVAL"
        ? "approve"
        : status === "APPROVED"
          ? "activate"
          : null;
  if (!action) return null;

  const label = {
    "submit-for-approval": "Submit for approval",
    approve: "Approve",
    activate: "Activate",
  }[action];

  return (
    <WorkflowAction
      label={label}
      onAction={() => postWorkflowAction(`leases/${record.id}/${action}/`)}
    />
  );
}

export function LeasesPage() {
  const applications = useQuery({
    queryKey: ["workflow", "applications"],
    queryFn: () => fetchWorkflowRecords("applications/"),
  });

  return (
    <WorkflowPage
      title="Leases"
      subtitle="Create a lease from an approved application and manage approval and activation."
    >
      <WorkflowForm
        title="Create lease"
        fields={[
          {
            name: "application",
            label: "Approved application",
            type: "select",
            required: true,
            options: (applications.data ?? [])
              .filter((record) => getRecordText(record, "status") === "APPROVED")
              .map((record) => ({
                value: record.id,
                label: `${getRecordText(record, "applicant")} — ${record.id.slice(0, 8)}`,
              })),
          },
          { name: "start_date", label: "Start date", type: "date", required: true },
          { name: "end_date", label: "End date", type: "date", required: true },
          {
            name: "monthly_rent",
            label: "Monthly rent",
            type: "number",
            step: "0.01",
            required: true,
          },
          {
            name: "deposit_amount",
            label: "Security deposit",
            type: "number",
            step: "0.01",
            required: true,
          },
          {
            name: "payment_due_day",
            label: "Payment due day",
            type: "number",
            required: true,
          },
          { name: "notes", label: "Notes", type: "textarea" },
        ]}
        onSubmit={(values) => createWorkflowRecord("leases/", values)}
      />
      <WorkflowRecords
        title="Leases"
        path="leases/"
        queryName="leases"
        columns={leaseColumns}
        actions={leaseActions}
        emptyMessage="No leases have been created."
      />
    </WorkflowPage>
  );
}
