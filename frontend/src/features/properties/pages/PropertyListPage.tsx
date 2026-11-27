import { useMemo, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

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
import { useAuth } from "../../../hooks/useAuth";
import { toastService } from "../../../services/toastService";
import { getPropertyErrorMessage } from "../api/properties.api";
import { PropertyActionDialogs } from "../components/PropertyActionDialogs";
import { PropertyActionsMenu } from "../components/PropertyActionsMenu";
import { PropertyCreateModal } from "../components/PropertyCreateModal";
import { useProperties } from "../hooks/useProperties";
import {
  PROPERTY_STATUSES,
  type Property,
  type PropertyStatus,
} from "../types/property";

const PAGE_SIZE = 20;

function isPropertyStatus(value: string): value is PropertyStatus {
  return PROPERTY_STATUSES.some((status) => status === value);
}

function formatStatus(status: PropertyStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function PropertyListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isOwner = user?.role === "OWNER";
  const [createOpen, setCreateOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [assigningProperty, setAssigningProperty] = useState<Property | null>(
    null,
  );
  const [archivingProperty, setArchivingProperty] = useState<Property | null>(
    null,
  );
  const search = searchParams.get("search") ?? "";
  const rawStatus = searchParams.get("status") ?? "";
  const status = isPropertyStatus(rawStatus) ? rawStatus : "";
  const city = searchParams.get("city") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [searchDraft, setSearchDraft] = useState({
    sourceSearch: search,
    value: search,
  });
  const searchValue =
    searchDraft.sourceSearch === search ? searchDraft.value : search;

  const query = useProperties({
    search: search || undefined,
    status: status || undefined,
    city: city.trim() || undefined,
    page,
  });
  const properties = query.data?.results ?? [];

  const filters: FilterDefinition[] = [
    {
      id: "status",
      label: "Status",
      type: "status",
      value: status,
      options: PROPERTY_STATUSES.map((value) => ({
        value,
        label: formatStatus(value),
      })),
    },
    {
      id: "city",
      label: "City",
      type: "text",
      value: city,
      placeholder: "Filter by city",
    },
  ];

  const columns = useMemo<DataTableColumn<Property>[]>(
    () => [
      {
        id: "name",
        header: "Property",
        sortValue: (property) => property.name,
        render: (property) => (
          <Link
            to={`/properties/${property.id}`}
            state={{
              returnTo: `${location.pathname}${location.search}`,
            }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            {property.name}
          </Link>
        ),
      },
      {
        id: "code",
        header: "Code",
        sortValue: (property) => property.code,
        render: (property) => property.code,
      },
      {
        id: "location",
        header: "Location",
        sortValue: (property) => property.city,
        render: (property) => (
          <span>
            {property.city}, {property.country}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        sortValue: (property) => property.status,
        render: (property) => <StatusBadge status={property.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        sortable: false,
        render: (property) => (
          <PropertyActionsMenu
            property={property}
            canAssignManager={isOwner}
            onView={() =>
              navigate(`/properties/${property.id}`, {
                state: {
                  returnTo: `${location.pathname}${location.search}`,
                },
              })
            }
            onEdit={() => setEditingProperty(property)}
            onAssignManager={() => setAssigningProperty(property)}
            onArchive={() => {
              setArchivingProperty(property);
            }}
          />
        ),
      },
    ],
    [isOwner, location.pathname, location.search, navigate],
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
    setSearchDraft({ sourceSearch: "", value: "" });
    setSearchParams({}, { replace: true });
  }

  function handleFilterChange(filterId: string, value: string) {
    if (filterId === "status") {
      updateQueryParameter(
        "status",
        isPropertyStatus(value) ? value : "",
      );
    } else if (filterId === "city") {
      updateQueryParameter("city", value.trim());
    }
  }

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Properties"
        subtitle="Manage property records, details, and manager assignments."
        actions={
          isOwner ? (
            <Button onClick={() => setCreateOpen(true)}>Add property</Button>
          ) : undefined
        }
      />

      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={(value) =>
          setSearchDraft({ sourceSearch: search, value })
        }
        onSearch={(value) => updateQueryParameter("search", value.trim())}
        searchLabel="Search properties"
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />

      {query.isError ? (
        <ErrorState
          title="Unable to load properties"
          description={getPropertyErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Properties"
            columns={columns}
            data={properties}
            getRowId={(property) => property.id}
            loading={query.isLoading}
            emptyMessage={
              search || status || city
                ? "No properties match the selected filters."
                : "No properties have been created."
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={query.data?.count ?? 0}
            onPageChange={(nextPage) =>
              updateQueryParameter("page", String(nextPage))
            }
          />
        </>
      )}

      <PropertyCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => toastService.success("Property created.")}
      />
      <PropertyActionDialogs
        editingProperty={editingProperty}
        assigningProperty={assigningProperty}
        archivingProperty={archivingProperty}
        onCloseEdit={() => setEditingProperty(null)}
        onCloseAssignment={() => setAssigningProperty(null)}
        onCloseArchive={() => setArchivingProperty(null)}
        onSaved={(message) => toastService.success(message)}
        onArchived={() => {
          setArchivingProperty(null);
          updateQueryParameter("page", "");
        }}
      />
    </div>
  );
}
