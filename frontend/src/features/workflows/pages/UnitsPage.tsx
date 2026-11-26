import { useQuery } from "@tanstack/react-query";

import { WorkflowForm } from "../components/WorkflowForm";
import { WorkflowPage } from "../components/WorkflowPage";
import { WorkflowRecords } from "../components/WorkflowRecords";
import { fetchWorkflowRecords, createWorkflowRecord, toOptions } from "../api";

const columns = [
  { key: "unit_number", label: "Unit" },
  { key: "property", label: "Property ID" },
  { key: "bedrooms", label: "Bedrooms" },
  { key: "rent_amount", label: "Monthly rent" },
  { key: "status", label: "Status" },
];

export function UnitsPage() {
  const properties = useQuery({
    queryKey: ["workflow", "properties"],
    queryFn: () => fetchWorkflowRecords("properties/"),
  });

  return (
    <WorkflowPage
      title="Units"
      subtitle="Create and maintain units within properties you manage."
    >
      <WorkflowForm
        title="Create unit"
        fields={[
          {
            name: "property",
            label: "Property",
            type: "select",
            required: true,
            options: toOptions(properties.data ?? [], "name"),
          },
          { name: "unit_number", label: "Unit number", required: true },
          { name: "floor", label: "Floor", type: "number", required: true },
          { name: "bedrooms", label: "Bedrooms", type: "number", required: true },
          {
            name: "bathrooms",
            label: "Bathrooms",
            type: "number",
            step: "0.5",
            required: true,
          },
          {
            name: "square_meters",
            label: "Square meters",
            type: "number",
            step: "0.01",
            required: true,
          },
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
          { name: "description", label: "Description", type: "textarea" },
        ]}
        onSubmit={(values) => createWorkflowRecord("units/", values)}
      />
      <WorkflowRecords
        title="Units"
        path="units/"
        queryName="units"
        columns={columns}
        emptyMessage="No units have been created."
      />
    </WorkflowPage>
  );
}
