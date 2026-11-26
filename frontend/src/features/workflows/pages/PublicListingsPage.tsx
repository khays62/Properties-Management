import { useQuery } from "@tanstack/react-query";

import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingSpinner } from "../../../components/feedback/LoadingSpinner";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import {
  createWorkflowRecord,
  fetchWorkflowRecords,
  getWorkflowErrorMessage,
  type WorkflowRecord,
} from "../api";
import { WorkflowForm } from "../components/WorkflowForm";

function ApplicantForm({ listing }: { listing: WorkflowRecord }) {
  const title =
    typeof listing.title === "string" ? listing.title : "Rental listing";

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-semibold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Monthly rent: {String(listing.rent_amount ?? "Contact manager")}
        </p>
      </div>
      <WorkflowForm
        title="Submit rental application"
        submitLabel="Submit application"
        fields={[
          { name: "first_name", label: "First name", required: true },
          { name: "last_name", label: "Last name", required: true },
          { name: "email", label: "Email", type: "email", required: true },
          { name: "phone", label: "Phone", required: true },
          {
            name: "monthly_income",
            label: "Monthly income",
            type: "number",
            step: "0.01",
            required: true,
          },
          { name: "employer_name", label: "Employer", required: true },
          {
            name: "current_address",
            label: "Current address",
            required: true,
          },
          {
            name: "move_in_date",
            label: "Preferred move-in date",
            type: "date",
            required: true,
          },
          { name: "notes", label: "Additional notes", type: "textarea" },
        ]}
        onSubmit={(values) => {
          const { first_name, last_name, email, phone, monthly_income, employer_name, current_address, move_in_date, notes } = values;
          return createWorkflowRecord("applications/", {
            listing: listing.id,
            move_in_date,
            notes,
            applicant: {
              first_name,
              last_name,
              email,
              phone,
              monthly_income,
              employer_name,
              current_address,
              employment_status: "EMPLOYED",
            },
          });
        }}
      />
    </Card>
  );
}

export function PublicListingsPage() {
  const listings = useQuery({
    queryKey: ["workflow", "public-listings"],
    queryFn: () => fetchWorkflowRecords("listings/public/"),
  });

  return (
    <main className="mx-auto min-h-screen max-w-6xl space-y-6 bg-background px-4 py-8 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            Available homes
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Browse current listings and apply directly.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => window.location.assign("/login")}
        >
          Sign in
        </Button>
      </header>
      {listings.isError ? (
        <ErrorState
          title="Unable to load listings"
          description={getWorkflowErrorMessage(listings.error)}
          onRetry={() => void listings.refetch()}
        />
      ) : listings.isLoading ? (
        <LoadingSpinner label="Loading available listings" />
      ) : listings.data?.length ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {listings.data.map((listing) => (
            <ApplicantForm key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-text-secondary">There are no published listings right now.</p>
        </Card>
      )}
    </main>
  );
}
