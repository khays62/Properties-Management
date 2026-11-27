import { Link } from "react-router-dom";

import { Card } from "../../../components/ui/Card";
import { usePageMetadata } from "../../../hooks/usePageMetadata";

export function ApplicationSuccessPage() {
  usePageMetadata(
    "Application submitted | OmniProperties",
    "Your rental application has been submitted to the property team.",
  );

  return (
    <main className="mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full space-y-5 text-center">
        <div
          aria-hidden="true"
          className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl font-bold text-emerald-700"
        >
          ✓
        </div>
        <h1 className="text-2xl font-semibold text-text-primary">
          Application submitted
        </h1>
        <p className="mx-auto max-w-xl leading-7 text-text-secondary">
          Your application has been sent to the property team for review. You
          can continue browsing available listings.
        </p>
        <Link
          to="/listings"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-omni-blue px-5 py-2 text-sm font-semibold text-white hover:bg-omni-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-omni-blue focus-visible:ring-offset-2"
        >
          Browse listings
        </Link>
      </Card>
    </main>
  );
}
