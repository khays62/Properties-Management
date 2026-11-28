import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  Breadcrumbs,
  DataTable,
  PageHeader,
  type DataTableColumn,
} from "../../../components/data";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ConfirmDialog } from "../../../components/overlays/ConfirmDialog";
import { Button } from "../../../components/ui/Button";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { getApiErrorMessage } from "../../../services/apiError";
import { toastService } from "../../../services/toastService";
import {
  useDeactivateTeamMember,
  useReactivateTeamMember,
  useTeamMember,
} from "../hooks/useTeam";
import type { TeamMemberAssignment } from "../types/team";
import { formatTeamDate, formatTeamRole } from "../utils/teamFormat";

type MembershipAction = "deactivate" | "reactivate";

export function TeamMemberDetailsPage() {
  const { memberId = "" } = useParams();
  const navigate = useNavigate();
  const memberQuery = useTeamMember(memberId);
  const deactivate = useDeactivateTeamMember();
  const reactivate = useReactivateTeamMember();
  const [pendingAction, setPendingAction] = useState<MembershipAction | null>(
    null,
  );
  const member = memberQuery.data;

  const assignmentColumns: DataTableColumn<TeamMemberAssignment>[] = [
    {
      id: "property",
      header: "Property",
      sortValue: (assignment) => assignment.property_name,
      render: (assignment) => assignment.property_name,
    },
    {
      id: "city",
      header: "City",
      sortValue: (assignment) => assignment.property_city,
      render: (assignment) => assignment.property_city,
    },
    {
      id: "assigned_date",
      header: "Assigned date",
      sortValue: (assignment) => assignment.assigned_date,
      render: (assignment) => formatTeamDate(assignment.assigned_date),
    },
    {
      id: "status",
      header: "Assignment status",
      sortValue: (assignment) => assignment.is_active,
      render: (assignment) => (
        <StatusBadge status={assignment.is_active ? "ACTIVE" : "INACTIVE"} />
      ),
    },
  ];

  async function confirmMembershipAction() {
    if (!member || !pendingAction) return;
    try {
      if (pendingAction === "deactivate") {
        await deactivate.mutateAsync(member.id);
        toastService.success("Team membership deactivated.");
      } else {
        await reactivate.mutateAsync(member.id);
        toastService.success("Team membership reactivated.");
      }
      setPendingAction(null);
    } catch (error) {
      toastService.error(getApiErrorMessage(error));
    }
  }

  if (memberQuery.isError) {
    return (
      <div className="space-y-6 py-6">
        <Breadcrumbs
          items={[
            { label: "Team management", href: "/team" },
            { label: "Team member", current: true },
          ]}
        />
        <ErrorState
          title="Unable to load team member"
          description={getApiErrorMessage(memberQuery.error)}
          onRetry={() => void memberQuery.refetch()}
        />
      </div>
    );
  }

  if (memberQuery.isLoading || !member) {
    return (
      <div className="space-y-6 py-6">
        <LoadingState
          label="Loading team member"
          message="Loading member details and Owner-scoped assignments…"
        />
      </div>
    );
  }

  const actionBusy = deactivate.isPending || reactivate.isPending;
  const isInactive = member.status === "INACTIVE";
  const invitation = member.invitation;

  return (
    <div className="space-y-6 py-6">
      <Breadcrumbs
        items={[
          { label: "Team management", href: "/team" },
          { label: member.full_name, current: true },
        ]}
      />
      <PageHeader
        title={member.full_name}
        subtitle={`${member.email} · ${formatTeamRole(member.role)}`}
        actions={
          <>
            <Button
              type="button"
              variant={isInactive ? "primary" : "danger"}
              disabled={actionBusy}
              onClick={() =>
                setPendingAction(isInactive ? "reactivate" : "deactivate")
              }
            >
              {isInactive ? "Reactivate membership" : "Deactivate membership"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/team?view=invitations")}
            >
              Manage invitations
            </Button>
          </>
        }
      />
      <section
        aria-labelledby="team-member-details-heading"
        className="rounded-lg border border-[var(--color-border)] bg-card p-5"
      >
        <h2
          id="team-member-details-heading"
          className="text-lg font-semibold text-text-primary"
        >
          User details
        </h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-sm text-text-secondary">Email</dt>
            <dd className="mt-1 font-medium">{member.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Role</dt>
            <dd className="mt-1 font-medium">{formatTeamRole(member.role)}</dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Membership status</dt>
            <dd className="mt-1">
              <StatusBadge status={member.status} />
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Created date</dt>
            <dd className="mt-1 font-medium">
              {formatTeamDate(member.created_at)}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-text-secondary">Assignments</dt>
            <dd className="mt-1 font-medium">{member.assignment_count}</dd>
          </div>
        </dl>
      </section>
      <section
        aria-labelledby="team-member-invitation-heading"
        className="rounded-lg border border-[var(--color-border)] bg-card p-5"
      >
        <h2
          id="team-member-invitation-heading"
          className="text-lg font-semibold text-text-primary"
        >
          Invitation
        </h2>
        {invitation ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-text-secondary">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={invitation.status} />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Created date</dt>
              <dd className="mt-1 font-medium">
                {formatTeamDate(invitation.created_at)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-secondary">Expires</dt>
              <dd className="mt-1 font-medium">
                {formatTeamDate(invitation.expires_at)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-text-secondary">
            No invitation record is available for this team member.
          </p>
        )}
      </section>
      <section aria-labelledby="team-member-assignments-heading">
        <div className="mb-3">
          <h2
            id="team-member-assignments-heading"
            className="text-lg font-semibold text-text-primary"
          >
            Property assignments
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            Assignments shown here belong to your properties only.
          </p>
        </div>
        {member.assignments.length === 0 ? (
          <EmptyState
            title="No property assignments"
            description="This team member has no property assignments for your account."
          />
        ) : (
          <DataTable
            ariaLabel="Property assignments"
            columns={assignmentColumns}
            data={member.assignments}
            getRowId={(assignment) => assignment.property_id}
          />
        )}
      </section>
      <Link
        to="/team"
        className="inline-flex rounded-sm text-sm font-medium text-omni-blue hover:underline"
      >
        Back to team
      </Link>
      <ConfirmDialog
        open={pendingAction !== null}
        title={
          pendingAction === "deactivate"
            ? "Deactivate team membership?"
            : "Reactivate team membership?"
        }
        description={
          pendingAction === "deactivate"
            ? "This deactivates the membership for your team and suspends this member's active assignments on your properties. It does not deactivate their global account or affect other Owners."
            : "This reactivates the membership for your team and restores assignments suspended by this membership. The system administrator must reactivate the global account if it is inactive."
        }
        confirmLabel={
          pendingAction === "deactivate"
            ? "Deactivate membership"
            : "Reactivate membership"
        }
        confirmVariant={pendingAction === "deactivate" ? "danger" : "primary"}
        isLoading={actionBusy}
        onClose={() => setPendingAction(null)}
        onConfirm={() => void confirmMembershipAction()}
      />
    </div>
  );
}
