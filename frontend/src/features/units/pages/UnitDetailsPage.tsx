import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { Breadcrumbs, PageHeader } from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { toastService } from "../../../services/toastService";
import { getListReturnPath } from "../../../utils/navigation";
import { getUnitErrorMessage } from "../api/units.api";
import { UnitActionsMenu } from "../components/UnitActionsMenu";
import { UnitEditModal } from "../components/UnitEditModal";
import { useUnit } from "../hooks/useUnits";
import {
  useProperties,
  useProperty,
} from "../../properties/hooks/useProperties";
import type { Unit } from "../types/unit";

function formatAmount(value: string | number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function UnitDetailsPage() {
  const { unitId = "" } = useParams<{ unitId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const unitQuery = useUnit(unitId);
  const unit = unitQuery.data;
  const propertyQuery = useProperty(unit?.property ?? "");
  const propertiesQuery = useProperties({});
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
  const unitsListPath = getListReturnPath(
    location.state,
    "/units",
    unit ? `/units?property=${encodeURIComponent(unit.property)}` : "/units",
  );

  if (unitQuery.isLoading) {
    return (
      <LoadingState label="Loading unit" message="Loading unit details…" />
    );
  }

  if (unitQuery.isError || !unit) {
    return (
      <div className="space-y-4 py-6">
        <Breadcrumbs
          items={[
            { label: "Units", href: unitsListPath },
            { label: "Unit details", current: true },
          ]}
        />
        <ErrorState
          title="Unable to load unit"
          description={
            unitQuery.error
              ? getUnitErrorMessage(unitQuery.error)
              : "The unit could not be found."
          }
          onRetry={() => void unitQuery.refetch()}
        />
      </div>
    );
  }

  const propertyName = propertyQuery.data?.name ?? "Property";
  const details = [
    ["Unit number", unit.unit_number],
    ["Floor", unit.floor],
    ["Bedrooms", unit.bedrooms],
    ["Bathrooms", unit.bathrooms],
    ["Area", `${unit.square_meters} m²`],
    ["Monthly rent", formatAmount(unit.rent_amount)],
    ["Deposit amount", formatAmount(unit.deposit_amount)],
  ] as const;

  return (
    <div className="space-y-6 py-6">
      <Breadcrumbs
        items={[
          {
            label: "Units",
            href: unitsListPath,
          },
          {
            label: propertyName,
            href: `/properties/${unit.property}`,
          },
          { label: `Unit ${unit.unit_number}`, current: true },
        ]}
      />
      <PageHeader
        title={`Unit ${unit.unit_number}`}
        subtitle={
          <Link
            to={`/properties/${unit.property}`}
            className="text-omni-blue hover:underline"
          >
            {propertyName}
          </Link>
        }
        actions={
          <UnitActionsMenu
            unit={unit}
            onEdit={() => setEditingUnit(unit)}
            onArchived={() =>
              navigate(
                `/units?property=${encodeURIComponent(unit.property)}`,
              )
            }
          />
        }
      />

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            Unit information
          </h2>
          <StatusBadge
            status={unit.is_active ? unit.status : "ARCHIVED"}
          />
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-text-secondary">{label}</dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>
          ))}
          <div className="sm:col-span-2 lg:col-span-3">
            <dt className="text-sm text-text-secondary">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap">
              {unit.description || "No description provided."}
            </dd>
          </div>
        </dl>
      </Card>

      {editingUnit && (
        <UnitEditModal
          open
          unitId={editingUnit.id}
          unit={editingUnit}
          properties={propertiesQuery.data?.results ?? []}
          onClose={() => setEditingUnit(null)}
          onSaved={() => toastService.success("Unit updated.")}
        />
      )}
    </div>
  );
}
