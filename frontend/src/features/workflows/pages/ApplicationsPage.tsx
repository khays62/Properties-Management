import { getRecordText, postWorkflowAction, type WorkflowRecord } from "../api";
import { WorkflowAction } from "../components/WorkflowAction";
import { WorkflowPage } from "../components/WorkflowPage";
import { WorkflowRecords } from "../components/WorkflowRecords";

const applicationColumns = [
  {
    key: "applicant",
    label: "Applicant",
    render: (record: WorkflowRecord) => (
      <span>{getRecordText(record, "applicant")}</span>
    ),
  },
  { key: "listing", label: "Listing ID" },
  { key: "move_in_date", label: "Move-in date" },
  { key: "status", label: "Status" },
];

const screeningColumns = [
  { key: "application", label: "Application ID" },
  { key: "score", label: "Score" },
  { key: "status", label: "Screening status" },
  { key: "reviewed_by", label: "Reviewed by" },
];

function applicationActions(record: WorkflowRecord) {
  const status = getRecordText(record, "status");
  if (status === "SUBMITTED") {
    return (
      <WorkflowAction
        label="Review"
        onAction={() =>
          postWorkflowAction(`applications/${record.id}/review/`)
        }
      />
    );
  }
  if (status === "UNDER_REVIEW") {
    return (
      <WorkflowAction
        label="Start screening"
        onAction={() =>
          postWorkflowAction(`applications/${record.id}/start-screening/`)
        }
      />
    );
  }
  if (status === "SCREENING") {
    return (
      <WorkflowAction
        label="Approve application"
        onAction={() =>
          postWorkflowAction(`applications/${record.id}/approve/`)
        }
      />
    );
  }
  return null;
}

function screeningActions(record: WorkflowRecord) {
  const status = getRecordText(record, "status");
  if (status === "PENDING") {
    return (
      <WorkflowAction
        label="Start"
        onAction={() => postWorkflowAction(`screenings/${record.id}/start/`)}
      />
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <WorkflowAction
        label="Pass screening"
        onAction={() =>
          postWorkflowAction(`screenings/${record.id}/pass/`, {
            score: 90,
            notes: "Verified during screening.",
            income_verified: true,
            employment_verified: true,
            references_checked: true,
          })
        }
      />
    );
  }
  return null;
}

export function ApplicationsPage() {
  return (
    <WorkflowPage
      title="Applications"
      subtitle="Review submissions, complete applicant screening, and approve qualified applicants."
    >
      <WorkflowRecords
        title="Rental applications"
        path="applications/"
        queryName="applications"
        columns={applicationColumns}
        actions={applicationActions}
        emptyMessage="No rental applications have been submitted."
      />
      <WorkflowRecords
        title="Applicant screenings"
        path="screenings/"
        queryName="screenings"
        columns={screeningColumns}
        actions={screeningActions}
        emptyMessage="No screenings are in progress."
      />
    </WorkflowPage>
  );
}
