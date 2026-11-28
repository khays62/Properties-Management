import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { Breadcrumbs, PageHeader } from "../../../components/data";
import { Alert } from "../../../components/feedback/Alert";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Textarea } from "../../../components/ui/Textarea";
import { usePageMetadata } from "../../../hooks/usePageMetadata";
import { getListReturnPath } from "../../../utils/navigation";
import {
  getMarketplaceErrorMessage,
} from "../api/publicListings.api";
import { formatAmount } from "../utils/format";
import {
  usePublicListing,
  useSubmitPublicApplication,
} from "../hooks/usePublicListings";
import {
  getTodayInMogadishu,
  PUBLIC_EMPLOYMENT_STATUSES,
  publicApplicationSchema,
  type PublicApplicationFormValues,
} from "../types/marketplace";

const EMPLOYMENT_STATUS_LABELS: Record<
  (typeof PUBLIC_EMPLOYMENT_STATUSES)[number],
  string
> = {
  EMPLOYED: "Employed",
  SELF_EMPLOYED: "Self-employed",
  UNEMPLOYED: "Unemployed",
  STUDENT: "Student",
};

export function PublicApplicationPage() {
  const { listingId = "" } = useParams<{ listingId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const listingQuery = usePublicListing(listingId);
  const submitApplication = useSubmitPublicApplication();
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const applicationReturnPath = getListReturnPath(
    location.state,
    `/listings/${listingId}`,
    `/listings/${listingId}`,
  );

  usePageMetadata(
    "Apply for a rental listing | OmniProperties",
    "Submit an application for a published OmniProperties rental listing.",
  );

  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<PublicApplicationFormValues>({
    resolver: zodResolver(publicApplicationSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      employer_name: "",
      monthly_income: "",
      current_address: "",
      move_in_date: "",
      notes: "",
    },
  });

  async function submit(values: PublicApplicationFormValues) {
    setSubmissionError(null);
    try {
      await submitApplication.mutateAsync({
        listing: listingId,
        move_in_date: values.move_in_date,
        notes: values.notes,
        applicant: {
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          phone: values.phone,
          employment_status: values.employment_status,
          employer_name: values.employer_name,
          monthly_income: values.monthly_income,
          current_address: values.current_address,
        },
      });
      navigate("/applications/success", { replace: true });
    } catch (error) {
      setSubmissionError(getMarketplaceErrorMessage(error));
    }
  }

  if (listingQuery.isLoading) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <LoadingState
          label="Loading listing"
          message="Checking that the listing is still available…"
        />
      </main>
    );
  }

  if (listingQuery.isError || !listingQuery.data) {
    return (
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Listings", href: "/listings" },
            { label: "Application", current: true },
          ]}
        />
        <ErrorState
          title="Unable to load listing"
          description={
            listingQuery.error
              ? getMarketplaceErrorMessage(listingQuery.error)
              : "This listing is no longer available for applications."
          }
          onRetry={() => void listingQuery.refetch()}
        />
      </main>
    );
  }

  const listing = listingQuery.data;

  return (
    <main className="mx-auto max-w-3xl space-y-7 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Breadcrumbs
        items={[
          { label: "Listings", href: "/listings" },
          {
            label: listing.title,
            href: `/listings/${listing.id}`,
          },
          { label: "Application", current: true },
        ]}
      />
      <PageHeader
        title="Rental application"
        subtitle={`Apply for ${listing.title} at ${listing.unit.property.name}.`}
      />
      <Card>
        <p className="text-sm text-text-secondary">Monthly rent</p>
        <p className="mt-1 text-xl font-semibold text-text-primary">
          {formatAmount(listing.rent_amount)}
        </p>
      </Card>

      {submissionError && (
        <Alert variant="danger" role="alert">
          {submissionError}
        </Alert>
      )}

      <form
        noValidate
        onSubmit={handleSubmit((values) => void submit(values))}
        className="space-y-6"
      >
        <Card className="space-y-5">
          <h2 className="text-lg font-semibold text-text-primary">
            Applicant information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="First name"
              required
              autoComplete="given-name"
              maxLength={150}
              error={errors.first_name?.message}
              {...register("first_name")}
            />
            <Input
              label="Last name"
              required
              autoComplete="family-name"
              maxLength={150}
              error={errors.last_name?.message}
              {...register("last_name")}
            />
            <Input
              label="Email"
              required
              type="email"
              autoComplete="email"
              maxLength={254}
              error={errors.email?.message}
              {...register("email")}
            />
            <Input
              label="Phone"
              required
              type="tel"
              autoComplete="tel"
              maxLength={32}
              error={errors.phone?.message}
              {...register("phone")}
            />
            <Select
              label="Employment status"
              required
              defaultValue=""
              error={errors.employment_status?.message}
              {...register("employment_status")}
            >
              <option value="" disabled>
                Select employment status
              </option>
              {PUBLIC_EMPLOYMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {EMPLOYMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
            <Input
              label="Employer name"
              autoComplete="organization"
              maxLength={255}
              error={errors.employer_name?.message}
              {...register("employer_name")}
            />
            <Input
              label="Monthly income"
              required
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              error={errors.monthly_income?.message}
              {...register("monthly_income")}
            />
            <Input
              label="Preferred move-in date"
              required
              type="date"
              min={getTodayInMogadishu()}
              error={errors.move_in_date?.message}
              {...register("move_in_date")}
            />
            <div className="sm:col-span-2">
              <Textarea
                label="Current address"
                required
                autoComplete="street-address"
                error={errors.current_address?.message}
                {...register("current_address")}
              />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Additional notes"
                helperText="Optional information for the property team."
                error={errors.notes?.message}
                {...register("notes")}
              />
            </div>
          </div>
        </Card>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            to={applicationReturnPath}
            className="op-button op-button--secondary"
          >
            Back to listing
          </Link>
          <Button
            type="submit"
            isLoading={isSubmitting || submitApplication.isPending}
          >
            Submit application
          </Button>
        </div>
      </form>
    </main>
  );
}
