import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../../hooks/useAuth";
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

const ticketColumns = [
  { key: "title", label: "Request" },
  { key: "unit_number", label: "Unit" },
  { key: "property_name", label: "Property" },
  { key: "tenant_name", label: "Tenant" },
  { key: "category", label: "Category" },
  { key: "priority", label: "Priority" },
  { key: "status", label: "Status" },
];

function ticketActions(record: WorkflowRecord, managerId: string | undefined) {
  const status = getRecordText(record, "status");
  if (status === "OPEN" && managerId) {
    return (
      <WorkflowAction
        label="Assign to me"
        onAction={() =>
          postWorkflowAction(`maintenance-tickets/${record.id}/assign/`, {
            assigned_to: managerId,
            notes: "Assigned to the current property manager.",
          })
        }
      />
    );
  }
  if (status === "ASSIGNED") {
    return (
      <WorkflowAction
        label="Start work"
        onAction={() =>
          postWorkflowAction(`maintenance-tickets/${record.id}/start/`, {})
        }
      />
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <WorkflowAction
        label="Resolve"
        onAction={() =>
          postWorkflowAction(`maintenance-tickets/${record.id}/resolve/`, {
            resolution_notes: "Work completed and verified.",
          })
        }
      />
    );
  }
  return null;
}

export function MaintenancePage() {
  const { user } = useAuth();
  const isTenant = user?.role === "TENANT";
  const leases = useQuery({
    queryKey: ["workflow", "leases"],
    queryFn: () => fetchWorkflowRecords("leases/"),
  });
  const units = useQuery({
    queryKey: ["workflow", "units"],
    queryFn: () => fetchWorkflowRecords("units/"),
    enabled: !isTenant,
  });
  const unitOptions = isTenant
    ? (leases.data ?? []).map((lease) => ({
        value: getRecordText(lease, "unit"),
        label: `Unit ${getRecordText(lease, "unit_number")}`,
      }))
    : (units.data ?? []).map((unit) => ({
        value: unit.id,
        label: getRecordText(unit, "unit_number"),
      }));
  const tenantOptions = [
    ...new Map(
      (leases.data ?? []).map((lease) => [
        getRecordText(lease, "tenant"),
        getRecordText(lease, "tenant_name"),
      ]),
    ),
  ].map(([value, label]) => ({ value, label }));

  return (
    <WorkflowPage
      title="Maintenance"
      subtitle="Submit, assign, track, and resolve property maintenance requests."
    >
      <WorkflowForm
        title="Create maintenance request"
        fields={[
          {
            name: "unit",
            label: "Unit",
            type: "select",
            required: true,
            options: unitOptions,
          },
          {
            name: "tenant",
            label: "Tenant profile",
            type: "select",
            required: !isTenant,
            options: tenantOptions,
          },
          { name: "title", label: "Request title", required: true },
          { name: "description", label: "Description", type: "textarea", required: true },
          {
            name: "category",
            label: "Category",
            type: "select",
            required: true,
            options: [
              { value: "PLUMBING", label: "Plumbing" },
              { value: "ELECTRICAL", label: "Electrical" },
              { value: "CLEANING", label: "Cleaning" },
              { value: "SECURITY", label: "Security" },
              { value: "HVAC", label: "HVAC" },
              { value: "OTHER", label: "Other" },
            ],
          },
          {
            name: "priority",
            label: "Priority",
            type: "select",
            required: true,
            options: [
              { value: "LOW", label: "Low" },
              { value: "MEDIUM", label: "Medium" },
              { value: "HIGH", label: "High" },
              { value: "URGENT", label: "Urgent" },
            ],
          },
        ]}
        onSubmit={(values) => {
          const { tenant, ...payload } = values;
          return createWorkflowRecord("maintenance-tickets/", {
            ...payload,
            ...(tenant ? { tenant } : {}),
          });
        }}
      />
      <WorkflowRecords
        title="Maintenance tickets"
        path="maintenance-tickets/"
        queryName="maintenance-tickets"
        columns={ticketColumns}
        actions={(record) => ticketActions(record, user?.id)}
        emptyMessage="No maintenance tickets have been submitted."
      />
    </WorkflowPage>
  );
}
