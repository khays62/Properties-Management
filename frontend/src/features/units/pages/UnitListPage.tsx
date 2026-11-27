import { useMemo, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";

import {
  DataTable,
  PageHeader,
  Pagination,
  SearchFilterBar,
  type DataTableColumn,
  type FilterDefinition,
} from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { toastService } from "../../../services/toastService";
import { getUnitErrorMessage } from "../api/units.api";
import { UnitActionsMenu } from "../components/UnitActionsMenu";
import { UnitCreateModal } from "../components/UnitCreateModal";
import { UnitEditModal } from "../components/UnitEditModal";
import { useUnits } from "../hooks/useUnits";
import { useProperties } from "../../properties/hooks/useProperties";
import type { Property } from "../../properties/types/property";
import {
  UNIT_STATUSES,
  type Unit,
  type UnitStatus,
} from "../types/unit";

const PAGE_SIZE = 20;
const EMPTY_PROPERTIES: Property[] = [];

function isUnitStatus(value: string): value is UnitStatus {
  return UNIT_STATUSES.some((status) => status === value);
}

function formatStatus(status: UnitStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function UnitListPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const propertyId = searchParams.get("property") ?? "";
  const search = searchParams.get("search") ?? "";
  const rawStatus = searchParams.get("status") ?? "";
  const status = isUnitStatus(rawStatus) ? rawStatus : "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [searchDraft, setSearchDraft] = useState({
    sourceSearch: search,
    value: search,
  });
  const searchValue =
    searchDraft.sourceSearch === search ? searchDraft.value : search;
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<Unit | null>(null);

  const propertiesQuery = useProperties({});
  const properties = propertiesQuery.data?.results ?? EMPTY_PROPERTIES;
  const selectedProperty = properties.find(
    (property) => property.id === propertyId,
  );
  const unitsQuery = useUnits({
    property: propertyId || undefined,
    status: status || undefined,
    search: search || undefined,
    page,
  });
  const units = unitsQuery.data?.results ?? [];
  const propertyNames = useMemo(
    () => new Map(properties.map((property) => [property.id, property.name])),
    [properties],
  );

  const filters: FilterDefinition[] = [
    {
      id: "property",
      label: "Property",
      type: "select",
      value: propertyId,
      options: properties.map((property) => ({
        value: property.id,
        label: `${property.name} (${property.code})`,
      })),
      placeholder: "All properties",
    },
    {
      id: "status",
      label: "Status",
      type: "status",
      value: status,
      options: UNIT_STATUSES.map((value) => ({
        value,
        label: formatStatus(value),
      })),
    },
  ];

  const columns = useMemo<DataTableColumn<Unit>[]>(
    () => [
      {
        id: "unit_number",
        header: "Unit",
        sortValue: (unit) => unit.unit_number,
        render: (unit) => (
          <Link
            to={`/units/${unit.id}`}
            state={{
              returnTo: `${location.pathname}${location.search}`,
            }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            {unit.unit_number}
          </Link>
        ),
      },
      {
        id: "property",
        header: "Property",
        sortValue: (unit) => propertyNames.get(unit.property) ?? unit.property,
        render: (unit) => (
          <Link
            to={`/properties/${unit.property}`}
            className="text-omni-blue hover:underline"
          >
            {propertyNames.get(unit.property) ?? "Property"}
          </Link>
        ),
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
        sortValue: (unit) => unit.is_active ? unit.status : "ARCHIVED",
        render: (unit) => (
          <StatusBadge status={unit.is_active ? unit.status : "ARCHIVED"} />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        sortable: false,
        render: (unit) => (
          <UnitActionsMenu
            unit={unit}
            onEdit={() => setEditingUnit(unit)}
          />
        ),
      },
    ],
    [location.pathname, location.search, propertyNames],
  );

  function updateQueryParameter(name: string, value: string) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(name, value);
        else next.delete(name);
        if (name !== "page") next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function resetFilters() {
    setSearchParams({}, { replace: true });
    setSearchDraft({ sourceSearch: "", value: "" });
  }

  function handleFilterChange(filterId: string, value: string) {
    if (filterId === "property") updateQueryParameter("property", value);
    else if (filterId === "status") {
      updateQueryParameter("status", isUnitStatus(value) ? value : "");
    }
  }

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title={selectedProperty ? `${selectedProperty.name} units` : "Units"}
        subtitle="Manage unit details, availability, and property assignments."
        actions={
          <Button
            onClick={() => setCreateOpen(true)}
            disabled={properties.length === 0}
            title={
              properties.length === 0
                ? "Create a property before adding units."
                : undefined
            }
          >
            Add unit
          </Button>
        }
      />

      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={(value) =>
          setSearchDraft({ sourceSearch: search, value })
        }
        onSearch={(value) => updateQueryParameter("search", value.trim())}
        searchLabel="Search units"
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />

      {propertiesQuery.isError ? (
        <ErrorState
          title="Unable to load properties"
          description={getUnitErrorMessage(propertiesQuery.error)}
          onRetry={() => void propertiesQuery.refetch()}
        />
      ) : unitsQuery.isError ? (
        <ErrorState
          title="Unable to load units"
          description={getUnitErrorMessage(unitsQuery.error)}
          onRetry={() => void unitsQuery.refetch()}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Units"
            columns={columns}
            data={units}
            getRowId={(unit) => unit.id}
            loading={unitsQuery.isLoading || propertiesQuery.isLoading}
            emptyMessage={
              search || status || propertyId
                ? "No units match the selected filters."
                : "No units have been created."
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={unitsQuery.data?.count ?? 0}
            onPageChange={(nextPage) =>
              updateQueryParameter("page", String(nextPage))
            }
          />
        </>
      )}

      <UnitCreateModal
        open={createOpen}
        properties={properties}
        initialPropertyId={propertyId}
        onClose={() => setCreateOpen(false)}
        onSaved={() => toastService.success("Unit created.")}
      />
      {editingUnit && (
        <UnitEditModal
          open
          unitId={editingUnit.id}
          unit={editingUnit}
          properties={properties}
          onClose={() => setEditingUnit(null)}
          onSaved={() => toastService.success("Unit updated.")}
        />
      )}
    </div>
  );
}
