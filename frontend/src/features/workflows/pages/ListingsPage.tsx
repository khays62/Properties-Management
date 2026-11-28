import { useQuery } from "@tanstack/react-query";

import { fetchWorkflowRecords, createWorkflowRecord, postWorkflowAction, toOptions, getRecordText, type WorkflowRecord } from "../api";
import { WorkflowAction } from "../components/WorkflowAction";
import { WorkflowForm } from "../components/WorkflowForm";
import { WorkflowPage } from "../components/WorkflowPage";
import { WorkflowRecords } from "../components/WorkflowRecords";

const columns = [
  { key: "title", label: "Listing" },
  { key: "unit_number", label: "Unit" },
  { key: "property_name", label: "Property" },
  { key: "rent_amount", label: "Rent" },
  { key: "available_date", label: "Available" },
  { key: "status", label: "Status" },
];

function listingActions(record: WorkflowRecord) {
  const status = getRecordText(record, "status");
  if (status === "DRAFT") {
    return (
      <WorkflowAction
        label="Publish"
        onAction={() =>
          postWorkflowAction(`listings/${record.id}/publish/`)
        }
      />
    );
  }
  if (status === "PUBLISHED") {
    return (
      <WorkflowAction
        label="Close"
        onAction={() => postWorkflowAction(`listings/${record.id}/close/`)}
      />
    );
  }
  return null;
}

export function ListingsPage() {
  const units = useQuery({
    queryKey: ["workflow", "units"],
    queryFn: () => fetchWorkflowRecords("units/"),
  });

  return (
    <WorkflowPage
      title="Listings"
      subtitle="Create rental listings, publish vacancies, and manage availability."
    >
      <p className="text-sm text-text-secondary">
        Prospective tenants can browse currently published listings.
      </p>
      <WorkflowForm
        title="Create listing"
        fields={[
          {
            name: "unit",
            label: "Unit",
            type: "select",
            required: true,
            options: toOptions(units.data ?? [], "unit_number"),
          },
          { name: "title", label: "Listing title", required: true },
          { name: "description", label: "Description", type: "textarea" },
          {
            name: "rent_amount",
            label: "Monthly rent",
            type: "number",
            step: "0.01",
            required: true,
          },
          {
            name: "deposit_amount",
            label: "Deposit amount",
            type: "number",
            step: "0.01",
            required: true,
          },
          {
            name: "available_date",
            label: "Available date",
            type: "date",
            required: true,
          },
          { name: "expires_at", label: "Expiration date", type: "date" },
        ]}
        onSubmit={(values) => {
          const { expires_at, ...payload } = values;
          return createWorkflowRecord("listings/", {
            ...payload,
            ...(expires_at ? { expires_at } : {}),
          });
        }}
      />
      <WorkflowRecords
        title="Listings"
        path="listings/"
        queryName="listings"
        columns={columns}
        actions={listingActions}
      />
    </WorkflowPage>
  );
}
