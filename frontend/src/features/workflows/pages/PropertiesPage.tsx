import { useQuery } from "@tanstack/react-query";

import { WorkflowForm } from "../components/WorkflowForm";
import { WorkflowPage } from "../components/WorkflowPage";
import { WorkflowRecords } from "../components/WorkflowRecords";
import {
  createWorkflowRecord,
  fetchWorkflowRecords,
  postWorkflowAction,
  toOptions,
} from "../api";
import { useAuth } from "../../../hooks/useAuth";

const columns = [
  { key: "name", label: "Property" },
  { key: "code", label: "Code" },
  { key: "city", label: "City" },
  { key: "status", label: "Status" },
];

export function PropertiesPage() {
  const { user } = useAuth();
  const properties = useQuery({
    queryKey: ["workflow", "properties"],
    queryFn: () => fetchWorkflowRecords("properties/"),
  });
  const isOwner = user?.role === "OWNER";

  return (
    <WorkflowPage
      title="Properties"
      subtitle="Manage property records and assign property managers."
    >
      {isOwner && (
        <div className="grid gap-6 xl:grid-cols-2">
          <WorkflowForm
            title="Create property"
            fields={[
              { name: "name", label: "Property name", required: true },
              { name: "code", label: "Property code", required: true },
              { name: "address", label: "Address", required: true },
              { name: "city", label: "City", required: true },
              { name: "country", label: "Country", required: true },
              { name: "description", label: "Description", type: "textarea" },
            ]}
            onSubmit={(values) => createWorkflowRecord("properties/", values)}
          />
          <WorkflowForm
            title="Assign a property manager"
            fields={[
              {
                name: "property",
                label: "Property",
                type: "select",
                required: true,
                options: toOptions(properties.data ?? [], "name"),
              },
              {
                name: "manager_email",
                label: "Property manager email",
                type: "email",
                required: true,
              },
            ]}
            onSubmit={(values) =>
              postWorkflowAction(
                `properties/${values.property}/assign-manager/`,
                { manager_email: values.manager_email },
              )
            }
          />
        </div>
      )}
      <WorkflowRecords
        title="Properties"
        path="properties/"
        queryName="properties"
        columns={columns}
        emptyMessage="No properties have been created."
      />
    </WorkflowPage>
  );
}
