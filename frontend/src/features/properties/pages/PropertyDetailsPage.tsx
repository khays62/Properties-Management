import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  Breadcrumbs,
  DataTable,
  PageHeader,
  type DataTableColumn,
} from "../../../components/data";
import { Alert } from "../../../components/feedback/Alert";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useAuth } from "../../../hooks/useAuth";
import { getPropertyErrorMessage } from "../api/properties.api";
import { PropertyActionDialogs } from "../components/PropertyActionDialogs";
import { PropertyActionsMenu } from "../components/PropertyActionsMenu";
import { useProperty } from "../hooks/useProperties";
import type { Property, PropertyUnit } from "../types/property";

const unitColumns: DataTableColumn<PropertyUnit>[] = [
  {
    id: "unit_number",
    header: "Unit",
    sortValue: (unit) => unit.unit_number,
    render: (unit) => unit.unit_number,
  },
  {
    id: "bedrooms",
    header: "Bedrooms",
    sortValue: (unit) => unit.bedrooms,
    render: (unit) => unit.bedrooms,
  },
  {
    id: "rent_amount",
    header: "Monthly rent",
    sortValue: (unit) => Number(unit.rent_amount),
    render: (unit) => unit.rent_amount,
  },
  {
    id: "status",
    header: "Status",
    sortValue: (unit) => unit.status,
    render: (unit) => <StatusBadge status={unit.status} />,
  },
];

export function PropertyDetailsPage() {
  const { propertyId = "" } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const query = useProperty(propertyId);
  const property = query.data;
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [assigningProperty, setAssigningProperty] = useState<Property | null>(
    null,
  );
  const [archivingProperty, setArchivingProperty] = useState<Property | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const isOwner = user?.role === "OWNER";

  if (query.isLoading) {
    return (
      <LoadingState
        label="Loading property"
        message="Loading property details…"
      />
    );
  }

  if (query.isError || !property) {
    return (
      <div className="space-y-4 py-6">
        <Breadcrumbs
          items={[
            { label: "Properties", href: "/properties" },
            { label: "Property details", current: true },
          ]}
        />
        <ErrorState
          title="Unable to load property"
          description={
            query.error
              ? getPropertyErrorMessage(query.error)
              : "The property could not be found."
          }
          onRetry={() => void query.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-6">
      <Breadcrumbs
        items={[
          { label: "Properties", href: "/properties" },
          { label: property.name, current: true },
        ]}
      />
      <PageHeader
        title={property.name}
        subtitle={`Property code: ${property.code}`}
        actions={
          <PropertyActionsMenu
            property={property}
            canAssignManager={isOwner}
            onEdit={() => setEditingProperty(property)}
            onAssignManager={() => setAssigningProperty(property)}
            onArchive={() => setArchivingProperty(property)}
          />
        }
      />

      {notice && (
        <Alert variant="success" role="status">
          {notice}
        </Alert>
      )}

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            Property information
          </h2>
          <StatusBadge status={property.status} />
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-secondary">Address</dt>
            <dd className="mt-1 font-medium">
              {property.address}, {property.city}, {property.country}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Property code</dt>
            <dd className="mt-1 font-medium">{property.code}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-text-secondary">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap">
              {property.description || "No description provided."}
            </dd>
          </div>
        </dl>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Units</h2>
            <p className="text-sm text-text-secondary">
              {property.units.length}{" "}
              {property.units.length === 1 ? "unit" : "units"} associated with
              this property.
            </p>
          </div>
        </div>
        <DataTable
          ariaLabel="Units at this property"
          columns={unitColumns}
          data={property.units}
          getRowId={(unit) => unit.id}
          emptyMessage="No units have been added to this property."
        />
      </section>

      <PropertyActionDialogs
        editingProperty={editingProperty}
        assigningProperty={assigningProperty}
        archivingProperty={archivingProperty}
        onCloseEdit={() => setEditingProperty(null)}
        onCloseAssignment={() => setAssigningProperty(null)}
        onCloseArchive={() => setArchivingProperty(null)}
        onSaved={setNotice}
        onArchived={() => {
          setArchivingProperty(null);
          navigate("/properties");
        }}
      />
    </div>
  );
}
