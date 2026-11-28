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
import { getApplicationErrorMessage } from "../api/applications.api";
import {
  useApplicationListings,
  useApplications,
} from "../hooks/useApplications";
import { useListingProperties } from "../../listings/hooks/useListings";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
} from "../types/application";

const PAGE_SIZE = 20;

function isApplicationStatus(value: string): value is ApplicationStatus {
  return APPLICATION_STATUSES.some((status) => status === value);
}

function formatStatus(status: ApplicationStatus): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

function formatSubmittedDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

export function ApplicationListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const [searchValue, setSearchValue] = useState(
    () => searchParams.get("search") ?? "",
  );
  const rawStatus = searchParams.get("status") ?? "";
  const status = isApplicationStatus(rawStatus) ? rawStatus : "";
  const propertyId = searchParams.get("property") ?? "";
  const listingId = searchParams.get("listing") ?? "";
  const city = searchParams.get("city") ?? "";
  const submittedDate = searchParams.get("date") ?? "";
  const requestedPage = Number(searchParams.get("page") ?? 1);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const propertiesQuery = useListingProperties();
  const listingsQuery = useApplicationListings();
  const applicationsQuery = useApplications({
    search: search || undefined,
    status: status || undefined,
    property: propertyId || undefined,
    listing: listingId || undefined,
    city: city.trim() || undefined,
    date: submittedDate || undefined,
    page,
  });
  const applications = applicationsQuery.data?.results ?? [];
  const listingById = useMemo(
    () =>
      new Map(
        (listingsQuery.data ?? []).map((listing) => [
          listing.id,
          listing.title,
        ]),
      ),
    [listingsQuery.data],
  );

  const filters: FilterDefinition[] = [
    {
      id: "property",
      label: "Property",
      type: "select",
      value: propertyId,
      options: (propertiesQuery.data ?? []).map((property) => ({
        value: property.id,
        label: `${property.name} (${property.code})`,
      })),
      placeholder: "All properties",
    },
    {
      id: "listing",
      label: "Listing",
      type: "select",
      value: listingId,
      options: (listingsQuery.data ?? []).map((listing) => ({
        value: listing.id,
        label: listing.title,
      })),
      placeholder: "All listings",
    },
    {
      id: "status",
      label: "Status",
      type: "status",
      value: status,
      options: APPLICATION_STATUSES.map((value) => ({
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
      id: "date",
      label: "Submitted date",
      type: "date",
      value: submittedDate,
    },
  ];

  const columns = useMemo<DataTableColumn<Application>[]>(
    () => [
      {
        id: "applicant",
        header: "Applicant",
        sortValue: (application) =>
          `${application.applicant.last_name} ${application.applicant.first_name}`,
        render: (application) => (
          <Link
            to={`/applications/${application.id}`}
            state={{
              returnTo: `${location.pathname}${location.search}`,
            }}
            className="font-medium text-omni-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue"
          >
            {application.applicant.first_name} {application.applicant.last_name}
          </Link>
        ),
      },
      {
        id: "listing",
        header: "Listing",
        sortValue: (application) =>
          listingById.get(application.listing) ?? application.listing,
        render: (application) =>
          application.listing_title ??
          listingById.get(application.listing) ??
          "Listing details unavailable",
      },
      {
        id: "move_in_date",
        header: "Requested move-in",
        sortValue: (application) => application.move_in_date,
        render: (application) => formatDate(application.move_in_date),
      },
      {
        id: "submitted_at",
        header: "Submitted",
        sortValue: (application) => application.submitted_at,
        render: (application) =>
          formatSubmittedDate(application.submitted_at),
      },
      {
        id: "status",
        header: "Status",
        sortValue: (application) => application.status,
        render: (application) => <StatusBadge status={application.status} />,
      },
      {
        id: "actions",
        header: "Actions",
        sortable: false,
        render: (application) => (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() =>
              navigate(`/applications/${application.id}`, {
                state: {
                  returnTo: `${location.pathname}${location.search}`,
                },
              })
            }
          >
            View
          </Button>
        ),
      },
    ],
    [listingById, location.pathname, location.search, navigate],
  );

  function resetFilters() {
    setSearchValue("");
    setSearchParams({}, { replace: true });
  }

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

  function handleFilterChange(filterId: string, value: string) {
    if (filterId === "property") updateQueryParameter("property", value);
    if (filterId === "listing") updateQueryParameter("listing", value);
    if (filterId === "status") {
      updateQueryParameter(
        "status",
        isApplicationStatus(value) ? value : "",
      );
    }
    if (filterId === "city") updateQueryParameter("city", value);
    if (filterId === "date") updateQueryParameter("date", value);
  }

  const filterError = propertiesQuery.error ?? listingsQuery.error;

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title="Applications"
        subtitle="Review rental applications and manage applicant screening."
      />

      <SearchFilterBar
        searchValue={searchValue}
        onSearchValueChange={setSearchValue}
        onSearch={(value) => {
          updateQueryParameter("search", value.trim());
        }}
        searchLabel="Search applications"
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />

      {filterError && (
        <ErrorState
          title="Unable to load application filters"
          description={getApplicationErrorMessage(filterError)}
          onRetry={() => {
            if (propertiesQuery.isError) void propertiesQuery.refetch();
            if (listingsQuery.isError) void listingsQuery.refetch();
          }}
        />
      )}

      {applicationsQuery.isError ? (
        <ErrorState
          title="Unable to load applications"
          description={getApplicationErrorMessage(applicationsQuery.error)}
          onRetry={() => void applicationsQuery.refetch()}
        />
      ) : (
        <>
          <DataTable
            ariaLabel="Rental applications"
            columns={columns}
            data={applications}
            getRowId={(application) => application.id}
            loading={applicationsQuery.isLoading}
            emptyMessage={
              search ||
              status ||
              propertyId ||
              listingId ||
              city ||
              submittedDate
                ? "No applications match the selected filters."
                : "No rental applications have been submitted."
            }
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={applicationsQuery.data?.count ?? 0}
            onPageChange={(nextPage) =>
              updateQueryParameter("page", String(nextPage))
            }
          />
        </>
      )}

    </div>
  );
}
