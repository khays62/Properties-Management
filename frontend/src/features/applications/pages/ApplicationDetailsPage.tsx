import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { Breadcrumbs, PageHeader } from "../../../components/data";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ConfirmDialog } from "../../../components/overlays/ConfirmDialog";
import { Button } from "../../../components/ui/Button";
import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { toastService } from "../../../services/toastService";
import { getListReturnPath } from "../../../utils/navigation";
import { useListing } from "../../listings/hooks/useListings";
import { useProperty } from "../../properties/hooks/useProperties";
import { useUnit } from "../../units/hooks/useUnits";
import { getApplicationErrorMessage } from "../api/applications.api";
import { ApplicationRejectionModal } from "../components/ApplicationRejectionModal";
import { ApplicationReviewModal } from "../components/ApplicationReviewModal";
import { ScreeningResultModal } from "../components/ScreeningResultModal";
import {
  useApplication,
  useApplicationTransition,
  useRejectApplication,
  useScreeningTransition,
} from "../hooks/useApplications";
import type {
  ApplicationTransitionAction,
  ScreeningAction,
  ScreeningResultInput,
} from "../types/application";
import {
  getApplicationAvailableActions,
  getScreeningAvailableActions,
} from "../utils/transitions";

type ConfirmableApplicationAction = Extract<
  ApplicationTransitionAction,
  "start-screening" | "approve" | "withdraw"
>;
type ScreeningResultAction = Extract<ScreeningAction, "pass" | "fail">;

const CONFIRMATION_COPY: Record<
  ConfirmableApplicationAction,
  { title: string; description: string; confirmLabel: string }
> = {
  "start-screening": {
    title: "Start applicant screening",
    description:
      "This moves the application into screening and creates its screening record.",
    confirmLabel: "Start screening",
  },
  approve: {
    title: "Approve application",
    description:
      "Approval is final for this application. The backend requires a passed screening.",
    confirmLabel: "Approve application",
  },
  withdraw: {
    title: "Withdraw application",
    description:
      "This will withdraw the application. Only submitted or under-review applications can be withdrawn.",
    confirmLabel: "Withdraw application",
  },
};

function formatEmploymentStatus(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "long",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

function formatDateTime(value: string | null): string {
  if (!value) return "Not completed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Mogadishu",
  }).format(date);
}

function formatAmount(value: string | number): string {
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ApplicationDetailsPage() {
  const { applicationId = "" } = useParams<{ applicationId: string }>();
  const location = useLocation();
  const applicationsPath = getListReturnPath(
    location.state,
    "/applications",
    "/applications",
  );
  const applicationQuery = useApplication(applicationId);
  const application = applicationQuery.data;
  const listingQuery = useListing(application?.listing ?? "");
  const listing = listingQuery.data;
  const unitQuery = useUnit(listing?.unit ?? "");
  const unit = unitQuery.data;
  const propertyQuery = useProperty(unit?.property ?? "");
  const transitionMutation = useApplicationTransition();
  const rejectionMutation = useRejectApplication();
  const screeningMutation = useScreeningTransition();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rejectionOpen, setRejectionOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] =
    useState<ConfirmableApplicationAction | null>(null);
  const [screeningStartOpen, setScreeningStartOpen] = useState(false);
  const [screeningResultAction, setScreeningResultAction] =
    useState<ScreeningResultAction | null>(null);

  if (applicationQuery.isLoading) {
    return (
      <LoadingState
        label="Loading application"
        message="Loading application details…"
      />
    );
  }

  if (applicationQuery.isError || !application) {
    return (
      <div className="space-y-4 py-6">
        <Breadcrumbs
          items={[
            { label: "Applications", href: applicationsPath },
            { label: "Application details", current: true },
          ]}
        />
        <ErrorState
          title="Unable to load application"
          description={
            applicationQuery.error
              ? getApplicationErrorMessage(applicationQuery.error)
              : "The application could not be found."
          }
          onRetry={() => void applicationQuery.refetch()}
        />
      </div>
    );
  }

  if (
    listingQuery.isLoading ||
    unitQuery.isLoading ||
    propertyQuery.isLoading
  ) {
    return (
      <LoadingState
        label="Loading application context"
        message="Loading listing, unit, and property information…"
      />
    );
  }

  if (
    listingQuery.isError ||
    !listing ||
    unitQuery.isError ||
    !unit ||
    propertyQuery.isError ||
    !propertyQuery.data
  ) {
    const relatedError =
      listingQuery.error ?? unitQuery.error ?? propertyQuery.error;
    return (
      <div className="space-y-4 py-6">
        <Breadcrumbs
          items={[
            { label: "Applications", href: applicationsPath },
            { label: "Application details", current: true },
          ]}
        />
        <ErrorState
          title="Unable to load application context"
          description={
            relatedError
              ? getApplicationErrorMessage(relatedError)
              : "The application's listing, unit, or property could not be found."
          }
          onRetry={() => {
            void listingQuery.refetch();
            void unitQuery.refetch();
            void propertyQuery.refetch();
          }}
        />
      </div>
    );
  }

  const applicant = application.applicant;
  const currentApplicationId = application.id;
  const screening = application.screening ?? null;
  const applicationActions = getApplicationAvailableActions(
    application.status,
    screening?.status,
  );
  const screeningActions = screening
    ? getScreeningAvailableActions(screening.status)
    : [];
  async function performApplicationTransition(
    action: ApplicationTransitionAction,
  ) {
    try {
      await transitionMutation.mutateAsync({
        id: currentApplicationId,
        action,
      });
      if (action === "start-screening") {
        toastService.success("Application moved to screening.");
      } else if (action === "approve") {
        toastService.success("Application approved.");
      } else if (action === "withdraw") {
        toastService.success("Application withdrawn.");
      } else {
        toastService.success("Application moved to review.");
      }
      setReviewOpen(false);
      setConfirmationAction(null);
    } catch (error) {
      toastService.error(getApplicationErrorMessage(error));
    }
  }

  async function rejectApplication(reason: string) {
    try {
      await rejectionMutation.mutateAsync({
        id: currentApplicationId,
        rejectionReason: reason,
      });
      toastService.success("Application rejected.");
      setRejectionOpen(false);
    } catch (error) {
      toastService.error(getApplicationErrorMessage(error));
    }
  }

  async function performScreeningTransition(
    action: ScreeningAction,
    result?: ScreeningResultInput,
  ) {
    if (!screening) return;
    try {
      await screeningMutation.mutateAsync({
        id: screening.id,
        applicationId: currentApplicationId,
        action,
        result,
      });
      if (action === "start") {
        toastService.success("Screening started.");
        setScreeningStartOpen(false);
      } else {
        toastService.success(
          action === "pass" ? "Screening passed." : "Screening failed.",
        );
        setScreeningResultAction(null);
      }
    } catch (error) {
      toastService.error(getApplicationErrorMessage(error));
    }
  }

  const property = propertyQuery.data;
  const requestedActions = [
    applicationActions.includes("review") && (
      <Button key="review" onClick={() => setReviewOpen(true)}>
        Review application
      </Button>
    ),
    applicationActions.includes("start-screening") && (
      <Button
        key="start-screening"
        onClick={() => setConfirmationAction("start-screening")}
      >
        Start screening
      </Button>
    ),
    applicationActions.includes("approve") && (
      <Button
        key="approve"
        onClick={() => setConfirmationAction("approve")}
      >
        Approve
      </Button>
    ),
    applicationActions.includes("reject") && (
      <Button
        key="reject"
        variant="danger"
        onClick={() => setRejectionOpen(true)}
      >
        Reject
      </Button>
    ),
    applicationActions.includes("withdraw") && (
      <Button
        key="withdraw"
        variant="secondary"
        onClick={() => setConfirmationAction("withdraw")}
      >
        Withdraw
      </Button>
    ),
  ].filter(Boolean);

  return (
    <div className="space-y-6 py-6">
      <Breadcrumbs
        items={[
          { label: "Applications", href: applicationsPath },
          { label: "Application details", current: true },
        ]}
      />
      <PageHeader
        title={`${applicant.first_name} ${applicant.last_name}`}
        subtitle={`Application ID: ${application.id}`}
        actions={requestedActions}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text-primary">
              Application
            </h2>
            <StatusBadge status={application.status} />
          </div>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-text-secondary">Submitted</dt>
              <dd className="mt-1 font-medium">
                {formatDateTime(application.submitted_at)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Requested move-in</dt>
              <dd className="mt-1 font-medium">
                {formatDate(application.move_in_date)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-text-secondary">Applicant notes</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium">
                {application.notes || "No notes provided."}
              </dd>
            </div>
            {application.rejection_reason && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-text-secondary">
                  Rejection reason
                </dt>
                <dd className="mt-1 whitespace-pre-wrap font-medium">
                  {application.rejection_reason}
                </dd>
              </div>
            )}
          </dl>
          {application.status === "SCREENING" &&
            screening?.status !== "PASSED" && (
              <p className="text-sm text-text-secondary">
                Approval becomes available after the screening has passed.
              </p>
            )}
        </Card>

        <Card className="space-y-5">
          <h2 className="text-base font-semibold text-text-primary">
            Applicant information
          </h2>
          <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm text-text-secondary">Email</dt>
              <dd className="mt-1 break-words font-medium">
                {applicant.email}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Phone</dt>
              <dd className="mt-1 font-medium">{applicant.phone}</dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Employment status</dt>
              <dd className="mt-1 font-medium">
                {formatEmploymentStatus(applicant.employment_status)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Employer</dt>
              <dd className="mt-1 font-medium">
                {applicant.employer_name || "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Monthly income</dt>
              <dd className="mt-1 font-medium">
                {formatAmount(applicant.monthly_income)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm text-text-secondary">Current address</dt>
              <dd className="mt-1 whitespace-pre-wrap font-medium">
                {applicant.current_address}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="space-y-4">
        <h2 className="text-base font-semibold text-text-primary">
          Listing and property
        </h2>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-text-secondary">Listing</dt>
            <dd className="mt-1 font-medium">
              <Link
                to={`/listings/${listing.id}`}
                className="text-omni-blue hover:underline"
              >
                {listing.title}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Monthly rent</dt>
            <dd className="mt-1 font-medium">
              {formatAmount(listing.rent_amount)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Unit</dt>
            <dd className="mt-1 font-medium">
              <Link
                to={`/units/${unit.id}`}
                className="text-omni-blue hover:underline"
              >
                {unit.unit_number}
              </Link>
            </dd>
          </div>
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
            <dt className="text-sm text-text-secondary">City</dt>
            <dd className="mt-1 font-medium">{property.city}</dd>
          </div>
        </dl>
      </Card>

      {application.status === "SCREENING" && (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-text-primary">
              Applicant screening
            </h2>
            {screening && <StatusBadge status={screening.status} />}
          </div>
          {screening ? (
            <>
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-sm text-text-secondary">Score</dt>
                  <dd className="mt-1 font-medium">
                    {screening.score ?? "Not recorded"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-secondary">
                    Income verified
                  </dt>
                  <dd className="mt-1 font-medium">
                    {screening.income_verified ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-secondary">
                    Employment verified
                  </dt>
                  <dd className="mt-1 font-medium">
                    {screening.employment_verified ? "Yes" : "No"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-secondary">
                    References checked
                  </dt>
                  <dd className="mt-1 font-medium">
                    {screening.references_checked ? "Yes" : "No"}
                  </dd>
                </div>
                <div className="sm:col-span-2 lg:col-span-4">
                  <dt className="text-sm text-text-secondary">
                    Screening notes
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap font-medium">
                    {screening.notes || "No screening notes."}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-text-secondary">Reviewed at</dt>
                  <dd className="mt-1 font-medium">
                    {formatDateTime(screening.reviewed_at)}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                {screeningActions.includes("start") && (
                  <Button
                    variant="secondary"
                    onClick={() => setScreeningStartOpen(true)}
                  >
                    Start screening
                  </Button>
                )}
                {screeningActions.includes("pass") && (
                  <Button onClick={() => setScreeningResultAction("pass")}>
                    Pass screening
                  </Button>
                )}
                {screeningActions.includes("fail") && (
                  <Button
                    variant="danger"
                    onClick={() => setScreeningResultAction("fail")}
                  >
                    Fail screening
                  </Button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-text-secondary">
              Screening details are not available. Refresh the application to
              check for an updated screening record.
            </p>
          )}
        </Card>
      )}

      <ApplicationReviewModal
        application={application}
        open={reviewOpen}
        isLoading={transitionMutation.isPending}
        onClose={() => setReviewOpen(false)}
        onConfirm={() => void performApplicationTransition("review")}
      />
      <ApplicationRejectionModal
        key={rejectionOpen ? "open" : "closed"}
        open={rejectionOpen}
        isSubmitting={rejectionMutation.isPending}
        onClose={() => setRejectionOpen(false)}
        onSubmit={(reason) => void rejectApplication(reason)}
      />
      <ScreeningResultModal
        key={screeningResultAction ?? "closed"}
        action={screeningResultAction}
        isSubmitting={screeningMutation.isPending}
        onClose={() => setScreeningResultAction(null)}
        onSubmit={(result) => {
          if (screeningResultAction) {
            void performScreeningTransition(screeningResultAction, result);
          }
        }}
      />
      <ConfirmDialog
        open={confirmationAction !== null}
        title={
          confirmationAction
            ? CONFIRMATION_COPY[confirmationAction].title
            : ""
        }
        description={
          confirmationAction
            ? CONFIRMATION_COPY[confirmationAction].description
            : ""
        }
        confirmLabel={
          confirmationAction
            ? CONFIRMATION_COPY[confirmationAction].confirmLabel
            : "Confirm"
        }
        confirmVariant={confirmationAction === "withdraw" ? "danger" : "primary"}
        isLoading={transitionMutation.isPending}
        onClose={() => setConfirmationAction(null)}
        onConfirm={() => {
          if (confirmationAction) {
            void performApplicationTransition(confirmationAction);
          }
        }}
      />
      <ConfirmDialog
        open={screeningStartOpen}
        title="Start screening"
        description="Starting this screening begins its review process."
        confirmLabel="Start screening"
        isLoading={screeningMutation.isPending}
        onClose={() => setScreeningStartOpen(false)}
        onConfirm={() => void performScreeningTransition("start")}
      />
    </div>
  );
}
