import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { Breadcrumbs, PageHeader } from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { toastService } from "../../../services/toastService";
import { getListReturnPath } from "../../../utils/navigation";
import { getListingErrorMessage } from "../api/listings.api";
import { ListingActionsMenu } from "../components/ListingActionsMenu";
import { ListingEditModal } from "../components/ListingEditModal";
import { useListing } from "../hooks/useListings";
import { useProperty } from "../../properties/hooks/useProperties";
import { useUnit } from "../../units/hooks/useUnits";
import { formatDateTime } from "../utils/dates";
import type { Listing } from "../types/listing";

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

export function ListingDetailsPage() {
  const { listingId = "" } = useParams<{ listingId: string }>();
  const location = useLocation();
  const listingQuery = useListing(listingId);
  const listing = listingQuery.data;
  const unitQuery = useUnit(listing?.unit ?? "");
  const unit = unitQuery.data;
  const propertyQuery = useProperty(unit?.property ?? "");
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const listingsPath = getListReturnPath(
    location.state,
    "/listings",
    "/listings",
  );

  if (listingQuery.isLoading) {
    return (
      <LoadingState
        label="Loading listing"
        message="Loading listing details…"
      />
    );
  }

  if (listingQuery.isError || !listing) {
    return (
      <div className="space-y-4 py-6">
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
              ? getListingErrorMessage(listingQuery.error)
              : "The listing could not be found."
          }
          onRetry={() => void listingQuery.refetch()}
        />
      </div>
    );
  }

  if (unitQuery.isLoading || propertyQuery.isLoading) {
    return (
      <LoadingState
        label="Loading listing information"
        message="Loading related unit and property details…"
      />
    );
  }

  if (unitQuery.isError || !unit || propertyQuery.isError || !propertyQuery.data) {
    const error = unitQuery.error ?? propertyQuery.error;
    return (
      <div className="space-y-4 py-6">
        <Breadcrumbs
          items={[
            { label: "Listings", href: listingsPath },
            { label: listing.title, current: true },
          ]}
        />
        <ErrorState
          title="Unable to load property and unit information"
          description={
            error
              ? getListingErrorMessage(error)
              : "The listing's related property or unit could not be found."
          }
          onRetry={() => {
            void unitQuery.refetch();
            void propertyQuery.refetch();
          }}
        />
      </div>
    );
  }

  const property = propertyQuery.data;
  const unitDetails = [
    ["Unit number", unit.unit_number],
    ["Floor", unit.floor],
    ["Bedrooms", unit.bedrooms],
    ["Bathrooms", unit.bathrooms],
    ["Area", `${unit.square_meters} m²`],
    ["Unit status", unit.status],
  ] as const;

  return (
    <div className="space-y-6 py-6">
      <Breadcrumbs
        items={[
          { label: "Listings", href: listingsPath },
          { label: listing.title, current: true },
        ]}
      />
      <PageHeader
        title={listing.title}
        subtitle={`${unit.unit_number} · ${property.name}`}
        actions={
          <ListingActionsMenu
            listing={listing}
            onEdit={() => setEditingListing(listing)}
          />
        }
      />

      <Card className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-text-primary">
            Listing information
          </h2>
          <StatusBadge status={listing.status} />
        </div>
        <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-secondary">Monthly rent</dt>
            <dd className="mt-1 font-medium">
              {formatAmount(listing.rent_amount)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Deposit amount</dt>
            <dd className="mt-1 font-medium">
              {formatAmount(listing.deposit_amount)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Available from</dt>
            <dd className="mt-1 font-medium">
              {formatAvailableDate(listing.available_date)}
            </dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-text-secondary">Description</dt>
            <dd className="mt-1 whitespace-pre-wrap">
              {listing.description || "No description provided."}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary">
          Property information
        </h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-secondary">Property</dt>
            <dd className="mt-1 font-medium">
              <Link
                to={`/properties/${property.id}`}
                className="text-omni-blue hover:underline"
              >
                {property.name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Property code</dt>
            <dd className="mt-1 font-medium">{property.code}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-sm text-text-secondary">Address</dt>
            <dd className="mt-1 font-medium">
              {property.address}, {property.city}, {property.country}
            </dd>
          </div>
        </dl>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary">
          Unit information
        </h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {unitDetails.map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-text-secondary">{label}</dt>
              <dd className="mt-1 font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <Link
          to={`/units/${unit.id}`}
          className="inline-flex text-sm font-medium text-omni-blue hover:underline"
        >
          View unit details
        </Link>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary">
          Publication information
        </h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-text-secondary">Published</dt>
            <dd className="mt-1 font-medium">
              {formatDateTime(listing.published_at)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Expires</dt>
            <dd className="mt-1 font-medium">
              {formatDateTime(listing.expires_at)}
            </dd>
          </div>
        </dl>
      </Card>

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
