import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Breadcrumbs,
  PageHeader,
  Pagination,
  SearchFilterBar,
  type FilterDefinition,
} from "../../../components/data";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Button } from "../../../components/ui/Button";
import { Link } from "react-router-dom";
import { usePageMetadata } from "../../../hooks/usePageMetadata";
import {
  getMarketplaceErrorMessage,
} from "../api/publicListings.api";
import { PublicListingCard } from "../components/PublicListingCard";
import { usePublicListings } from "../hooks/usePublicListings";

const PAGE_SIZE = 20;

function getPageValue(value: string | null): number {
  if (!value) return 1;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

interface PublicListingsFiltersProps {
  search: string;
  city: string;
  availableDate: string;
  onSearch: (value: string) => void;
  onFilterChange: (filterId: string, value: string) => void;
  onReset: () => void;
}

function PublicListingsFilters({
  city,
  availableDate,
  onFilterChange,
  onReset,
  onSearch,
  search,
}: PublicListingsFiltersProps) {
  const [searchValue, setSearchValue] = useState(search);
  const filters: FilterDefinition[] = [
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

  return (
    <SearchFilterBar
      searchValue={searchValue}
      onSearchValueChange={setSearchValue}
      onSearch={onSearch}
      searchLabel="Search listings"
      filters={filters}
      onFilterChange={onFilterChange}
      onReset={onReset}
    />
  );
}

export function PublicListingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get("search") ?? "";
  const city = searchParams.get("city") ?? "";
  const availableDate = searchParams.get("available_date") ?? "";
  const page = getPageValue(searchParams.get("page"));

  usePageMetadata(
    "Available rental listings | OmniProperties",
    "Browse published rental listings managed with OmniProperties.",
  );

  const query = usePublicListings({
    ...(search ? { search } : {}),
    ...(city ? { city } : {}),
    ...(availableDate ? { available_date: availableDate } : {}),
    page,
  });

  function updateSearchParams(
    updates: Record<string, string>,
    replace = true,
  ) {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if ("search" in updates || "city" in updates || "available_date" in updates) {
      next.delete("page");
    }
    setSearchParams(next, { replace });
  }

  function handleFilterChange(filterId: string, value: string) {
    updateSearchParams({ [filterId]: value });
  }

  function resetFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  return (
    <main className="mx-auto max-w-7xl space-y-7 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Listings", current: true },
        ]}
      />
      <PageHeader
        title="Available listings"
        subtitle="Explore published homes and review their details before applying."
        actions={
          <Link
            to="/login"
            className="op-button op-button--secondary"
          >
            Property team sign in
          </Link>
        }
      />
      <PublicListingsFilters
        key={JSON.stringify([search, city, availableDate])}
        search={search}
        city={city}
        availableDate={availableDate}
        onSearch={(value) => updateSearchParams({ search: value.trim() })}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />

      {query.isLoading ? (
        <LoadingState
          label="Loading available listings"
          message="Loading published rental listings…"
        />
      ) : query.isError ? (
        <ErrorState
          title="Unable to load listings"
          description={getMarketplaceErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : query.data && query.data.results.length > 0 ? (
        <>
          <p className="text-sm text-text-secondary" aria-live="polite">
            {query.data.count}{" "}
            {query.data.count === 1 ? "listing" : "listings"} found
          </p>
          <section
            aria-label="Available rental listings"
            className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
          >
            {query.data.results.map((listing) => (
              <PublicListingCard key={listing.id} listing={listing} />
            ))}
          </section>
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={query.data.count}
            onPageChange={(nextPage) =>
              updateSearchParams(
                { page: nextPage === 1 ? "" : String(nextPage) },
                false,
              )
            }
          />
        </>
      ) : (
        <EmptyState
          title="No listings found"
          description={
            search || city || availableDate
              ? "Try changing your search or filters."
              : "There are no published listings available right now."
          }
          action={
            search || city || availableDate ? (
              <Button variant="secondary" onClick={resetFilters}>
                Clear search and filters
              </Button>
            ) : undefined
          }
        />
      )}
    </main>
  );
}
