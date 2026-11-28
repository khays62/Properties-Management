import { Link, useLocation, useParams } from "react-router-dom";

import { Breadcrumbs, PageHeader } from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { usePageMetadata } from "../../../hooks/usePageMetadata";
import { getListReturnPath } from "../../../utils/navigation";
import { getMarketplaceErrorMessage } from "../api/publicListings.api";
import { usePublicListing } from "../hooks/usePublicListings";
import { formatAmount, formatListingDate } from "../utils/format";

export function PublicListingDetailsPage() {
  const { listingId = "" } = useParams<{ listingId: string }>();
  const location = useLocation();
  const listingsPath = getListReturnPath(
    location.state,
    "/listings",
    "/listings",
  );
  const listingQuery = usePublicListing(listingId);
  const listing = listingQuery.data;

  usePageMetadata(
    listing
      ? `${listing.title} | OmniProperties`
      : "Listing details | OmniProperties",
    listing
      ? `${listing.title} in ${listing.unit.property.city}. View rent, availability, and application details.`
      : "View a published rental listing on OmniProperties.",
  );

  if (listingQuery.isLoading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <LoadingState
          label="Loading listing details"
          message="Loading published listing information…"
        />
      </main>
    );
  }

  if (listingQuery.isError || !listing) {
    return (
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Listings", href: listingsPath },
            { label: "Listing details", current: true },
          ]}
        />
        <ErrorState
          title="Unable to load listing"
          description={
            listingQuery.error
              ? getMarketplaceErrorMessage(listingQuery.error)
              : "This listing is not available."
          }
          onRetry={() => void listingQuery.refetch()}
        />
      </main>
    );
  }

  const { property } = listing.unit;

  return (
    <main className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Breadcrumbs
        items={[
          { label: "Listings", href: listingsPath },
          { label: listing.title, current: true },
        ]}
      />
      <PageHeader
        title={listing.title}
        subtitle={`${property.name} · ${property.city}, ${property.country}`}
        actions={<StatusBadge status={listing.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-text-primary">
              About this home
            </h2>
            <p className="mt-3 whitespace-pre-wrap leading-7 text-text-secondary">
              {listing.description || "No additional description is available."}
            </p>
          </Card>
          <Card>
            <h2 className="text-lg font-semibold text-text-primary">
              Property and unit
            </h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-text-secondary">Property</dt>
                <dd className="mt-1 font-medium">{property.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Address</dt>
                <dd className="mt-1 font-medium">
                  {property.address}, {property.city}, {property.country}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Unit</dt>
                <dd className="mt-1 font-medium">
                  {listing.unit.unit_number}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Floor</dt>
                <dd className="mt-1 font-medium">{listing.unit.floor}</dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Bedrooms</dt>
                <dd className="mt-1 font-medium">{listing.unit.bedrooms}</dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Bathrooms</dt>
                <dd className="mt-1 font-medium">{listing.unit.bathrooms}</dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Area</dt>
                <dd className="mt-1 font-medium">
                  {listing.unit.square_meters} m²
                </dd>
              </div>
              <div>
                <dt className="text-sm text-text-secondary">Available from</dt>
                <dd className="mt-1 font-medium">
                  {formatListingDate(listing.available_date)}
                </dd>
              </div>
            </dl>
          </Card>
        </div>

        <aside>
          <Card className="space-y-5">
            <div>
              <p className="text-sm text-text-secondary">Monthly rent</p>
              <p className="mt-1 text-2xl font-bold text-text-primary">
                {formatAmount(listing.rent_amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Security deposit</p>
              <p className="mt-1 text-lg font-semibold text-text-primary">
                {formatAmount(listing.deposit_amount)}
              </p>
            </div>
            <Link
              to={`/listings/${listing.id}/apply`}
              state={{ returnTo: `${location.pathname}${location.search}` }}
              className="op-button op-button--primary w-full"
            >
              Apply for this listing
            </Link>
            <Link
              to={listingsPath}
              className="op-button op-button--secondary w-full"
            >
              Back to listings
            </Link>
          </Card>
        </aside>
      </div>
    </main>
  );
}
