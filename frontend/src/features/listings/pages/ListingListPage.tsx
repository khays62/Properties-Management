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
import { toastService } from "../../../services/toastService";
import { getListingErrorMessage } from "../api/listings.api";
import { ListingActionsMenu } from "../components/ListingActionsMenu";
import { ListingCreateModal } from "../components/ListingCreateModal";
import { ListingEditModal } from "../components/ListingEditModal";
import {
  useListingProperties,
  useListings,
} from "../hooks/useListings";
import {
  LISTING_STATUSES,
  type Listing,
  type ListingStatus,
} from "../types/listing";

const PAGE_SIZE = 20;

function isListingStatus(value: string): value is ListingStatus {
  return LISTING_STATUSES.some((status) => status === value);
}

function formatStatus(status: ListingStatus): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatAmount(value: string | number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatAvailableDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function ListingListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const search = searchParams.get("search") ?? "";
  const rawStatus = searchParams.get("status") ?? "";
  const status = isListingStatus(rawStatus) ? rawStatus : "";
  const propertyId = searchParams.get("property") ?? "";
  const city = searchParams.get("city") ?? "";
  const availableDate = searchParams.get("available_date") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [searchDraft, setSearchDraft] = useState({
    sourceSearch: search,
    value: search,
  });
  const searchValue =
    searchDraft.sourceSearch === search ? searchDraft.value : search;

  const propertiesQuery = useListingProperties();
  const properties = propertiesQuery.data ?? [];
  const query = useListings({
    search: search || undefined,
    status: status || undefined,
    property: propertyId || undefined,
    city: city.trim() || undefined,
    available_date: availableDate || undefined,
    page,
  });
  const listings = query.data?.results ?? [];

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
      options: LISTING_STATUSES.map((value) => ({
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
    {
      id: "available_date",
      label: "Available date",
      type: "date",
      value: availableDate,
    },
  ];

  const columns = useMemo<DataTableColumn<Listing>[]>(
    () => [
      {
        id: "title",
        header: "Listing",
        sortValue: (listing) => listing.title,
        render: (listing) => (
          <Link
            to={`/listings/${listing.id}`}
            state={{
              returnTo: `${location.pathname}${location.search}`,
            }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            {listing.title}
          </Link>
        ),
      },
      {
        id: "rent_amount",
        header: "Monthly rent",
        sortValue: (listing) => Number(listing.rent_amount),
        render: (listing) => formatAmount(listing.rent_amount),
      },
      {
        id: "available_date",
        header: "Available from",
        sortValue: (listing) => listing.available_date,
        render: (listing) => formatAvailableDate(listing.available_date),
      },
      {
        id: "status",
        header: "Status",
        sortValue: (listing) => listing.status,
        render: (listing) => <StatusBadge status={listing.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        sortable: false,
        render: (listing) => (
          <ListingActionsMenu
            listing={listing}
            onView={() =>
              navigate(`/listings/${listing.id}`, {
                state: {
                  returnTo: `${location.pathname}${location.search}`,
                },
              })
            }
            onEdit={() => setEditingListing(listing)}
          />
        ),
      },
    ],
    [location.pathname, location.search, navigate],
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
    if (filterId === "property") {
      updateQueryParameter("property", value);
    } else if (filterId === "status") {
      updateQueryParameter(
        "status",
        isListingStatus(value) ? value : "",
      );
    } else if (filterId === "city") {
      updateQueryParameter("city", value.trim());
    } else if (filterId === "available_date") {
      updateQueryParameter("available_date", value);
    }
  }

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Listings"
        subtitle="Create and manage rental listings and their publication status."
        actions={<Button onClick={() => setCreateOpen(true)}>Add listing</Button>}
      />

      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={(value) =>
          setSearchDraft({ sourceSearch: search, value })
        }
        onSearch={(value) => updateQueryParameter("search", value.trim())}
        searchLabel="Search listings"
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />

      {query.isError ? (
        <ErrorState
          title="Unable to load listings"
          description={getListingErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {propertiesQuery.isError && (
            <ErrorState
              title="Unable to load property filters"
              description={getListingErrorMessage(propertiesQuery.error)}
              onRetry={() => void propertiesQuery.refetch()}
            />
          )}
          <DataTable
            ariaLabel="Listings"
            columns={columns}
            data={listings}
            getRowId={(listing) => listing.id}
            loading={query.isLoading}
            emptyMessage={
              search || status || propertyId || city || availableDate
                ? "No listings match the selected filters."
                : "No listings have been created."
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

      <ListingCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSaved={() => toastService.success("Listing created as a draft.")}
      />
      {editingListing && (
        <ListingEditModal
          open
          listing={editingListing}
          onClose={() => setEditingListing(null)}
          onSaved={() => toastService.success("Listing updated.")}
        />
      )}
    </div>
  );
}
