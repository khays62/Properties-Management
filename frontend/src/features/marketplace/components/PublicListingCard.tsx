import { Link, useLocation } from "react-router-dom";

import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { PublicListing } from "../types/marketplace";
import { formatAmount, formatListingDate } from "../utils/format";

export function PublicListingCard({ listing }: { listing: PublicListing }) {
  const location = useLocation();
  const property = listing.unit.property;

  return (
    <Card className="flex h-full flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-text-primary">
            {listing.title}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            {property.name} · {property.city}
          </p>
        </div>
        <StatusBadge status={listing.status} />
      </div>
      <dl className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-text-secondary">Monthly rent</dt>
          <dd className="mt-1 font-semibold text-text-primary">
            {formatAmount(listing.rent_amount)}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Bedrooms</dt>
          <dd className="mt-1 font-semibold text-text-primary">
            {listing.unit.bedrooms}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Unit</dt>
          <dd className="mt-1 font-semibold text-text-primary">
            {listing.unit.unit_number}
          </dd>
        </div>
        <div>
          <dt className="text-text-secondary">Available</dt>
          <dd className="mt-1 font-semibold text-text-primary">
            {formatListingDate(listing.available_date)}
          </dd>
        </div>
      </dl>
      <Link
        to={`/listings/${listing.id}`}
        state={{ returnTo: `${location.pathname}${location.search}` }}
        className="op-button op-button--primary mt-auto"
      >
        View listing
      </Link>
    </Card>
  );
}
