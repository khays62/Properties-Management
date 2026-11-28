import { useCallback, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import {
  DataTable,
  PageHeader,
  Pagination,
  SearchFilterBar,
  type DataTableColumn,
  type FilterDefinition,
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
  useCreateTeamInvitation,
  useResendTeamInvitation,
  useRevokeTeamInvitation,
  useTeamMembers,
} from "../hooks/useTeam";
import type {
  TeamInvitationCreateInput,
  TeamMember,
  TeamMemberQueryParams,
  TeamMemberStatus,
  TeamRole,
} from "../types/team";
import { formatTeamDate, formatTeamRole } from "../utils/teamFormat";
import { TeamInvitationFormModal } from "../components/TeamInvitationFormModal";
import { InvitationManagementPage } from "./InvitationManagementPage";

const PAGE_SIZE = 20;
const MEMBER_STATUSES: readonly TeamMemberStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "PENDING",
  "EXPIRED",
];
const TEAM_ROLES: readonly TeamRole[] = [
  "PROPERTY_MANAGER",
  "ACCOUNTANT",
];

function parsePage(value: string | null): number {
  const page = Number(value ?? 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function isTeamRole(value: string | null): value is TeamRole {
  return TEAM_ROLES.some((role) => role === value);
}

function isTeamStatus(value: string | null): value is TeamMemberStatus {
  return MEMBER_STATUSES.some((status) => status === value);
}

interface TeamSearchFilterControlsProps {
  search: string;
  filters: FilterDefinition[];
  onSearch: (value: string) => void;
  onFilterChange: (filterId: string, value: string) => void;
  onReset: () => void;
}

function TeamSearchFilterControls({
  filters,
  onFilterChange,
  onReset,
  onSearch,
  search,
}: TeamSearchFilterControlsProps) {
  const [searchValue, setSearchValue] = useState(search);
  return (
    <SearchFilterBar
      searchLabel="Search team members"
      searchValue={searchValue}
      onSearchValueChange={setSearchValue}
      onSearch={onSearch}
      filters={filters}
      onFilterChange={onFilterChange}
      onReset={onReset}
    />
  );
}

export function TeamListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") === "invitations" ? "invitations" : "members";
  const page = parsePage(searchParams.get("page"));
  const roleParam = searchParams.get("role");
  const statusParam = searchParams.get("status");
  const role = isTeamRole(roleParam) ? roleParam : undefined;
  const status = isTeamStatus(statusParam) ? statusParam : undefined;
  const search = searchParams.get("search") ?? "";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [memberToRevoke, setMemberToRevoke] = useState<TeamMember | null>(null);

  const params: TeamMemberQueryParams = useMemo(
    () => ({
      page,
      page_size: PAGE_SIZE,
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
    }),
    [page, role, search, status],
  );
  const query = useTeamMembers(params);
  const createInvitation = useCreateTeamInvitation();
  const resendInvitation = useResendTeamInvitation();
  const revokeInvitation = useRevokeTeamInvitation();
  const updateBusy =
    resendInvitation.isPending || revokeInvitation.isPending;

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      next.delete("page");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const onSearch = useCallback(
    (value: string) => updateParams({ search: value.trim() }),
    [updateParams],
  );

  const filters: FilterDefinition[] = [
    {
      id: "role",
      label: "Role",
      type: "select",
      value: role ?? "",
      options: [
        { label: "Property Manager", value: "PROPERTY_MANAGER" },
        { label: "Accountant", value: "ACCOUNTANT" },
      ],
    },
    {
      id: "status",
      label: view === "invitations" ? "Invitation/member status" : "Status",
      type: "select",
      value: status ?? "",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
        { label: "Pending invitation", value: "PENDING" },
        { label: "Expired invitation", value: "EXPIRED" },
      ],
    },
  ];

  const memberColumns = useMemo<DataTableColumn<TeamMember>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        sortValue: (member) => member.full_name,
        render: (member) => (
          <Link
            to={`/team/${member.id}`}
            className="font-medium text-omni-blue hover:underline"
          >
            {member.full_name}
          </Link>
        ),
      },
      {
        id: "email",
        header: "Email",
        sortValue: (member) => member.email,
        render: (member) => member.email,
      },
      {
        id: "role",
        header: "Role",
        sortValue: (member) => member.role,
        render: (member) => formatTeamRole(member.role),
      },
      {
        id: "status",
        header: "Status",
        sortValue: (member) => member.status,
        render: (member) => <StatusBadge status={member.status} />,
      },
      {
        id: "created_at",
        header: "Created",
        sortValue: (member) => member.created_at,
        render: (member) => formatTeamDate(member.created_at),
      },
      {
        id: "assignment_count",
        header: "Assignments",
        sortValue: (member) => member.assignment_count,
        render: (member) => member.assignment_count,
      },
      {
        id: "invitation_status",
        header: "Invitation",
        sortValue: (member) => member.invitation?.status,
        render: (member) =>
          member.invitation ? (
            <StatusBadge status={member.invitation.status} />
          ) : (
            <span className="text-text-secondary">—</span>
          ),
      },
    ],
    [],
  );

  async function submitInvitation(values: TeamInvitationCreateInput) {
    const invitation = await createInvitation.mutateAsync(values);
    if (invitation.status === "ACCEPTED") {
      toastService.info(
        "Existing staff account added to your team. No setup email was sent.",
      );
    } else {
      toastService.success("Team invitation sent.");
    }
  }

  async function handleResend(member: TeamMember) {
    if (!member.invitation) return;
    try {
      await resendInvitation.mutateAsync(member.invitation.id);
      toastService.success(`Invitation resent to ${member.email}.`);
    } catch (error) {
      toastService.error(getApiErrorMessage(error));
    }
  }

  async function handleRevoke() {
    if (!memberToRevoke?.invitation) return;
    try {
      await revokeInvitation.mutateAsync(memberToRevoke.invitation.id);
      toastService.success("Invitation revoked and team membership deactivated.");
      setMemberToRevoke(null);
    } catch (error) {
      toastService.error(getApiErrorMessage(error));
    }
  }

  function changePage(nextPage: number) {
    const next = new URLSearchParams(searchParams);
    if (nextPage > 1) next.set("page", String(nextPage));
    else next.delete("page");
    setSearchParams(next, { replace: true });
  }

  function changeView(nextView: "members" | "invitations") {
    const next = new URLSearchParams(searchParams);
    if (nextView === "invitations") {
      next.set("view", "invitations");
      if (!next.has("status")) next.set("status", "PENDING");
    } else {
      next.delete("view");
      next.delete("status");
    }
    next.delete("page");
    setSearchParams(next, { replace: true });
  }

  function resetFilters() {
    setSearchParams(
      view === "invitations" ? { view: "invitations" } : {},
      { replace: true },
    );
  }

  function handleFilterChange(filterId: string, value: string) {
    if (filterId === "role" || filterId === "status") {
      updateParams({ [filterId]: value });
    }
  }

  const members = query.data?.results ?? [];
  const emptyDescription =
    view === "invitations"
      ? "No team members match these invitation filters."
      : "Invite a Property Manager or Accountant to give them access to your team.";

  return (
    <div className="space-y-6 py-6">
      <PageHeader
        title={view === "invitations" ? "Invitation management" : "Team management"}
        subtitle={
          view === "invitations"
            ? "Review invitation status and manage pending or expired invitations."
            : "Manage your Property Managers and Accountants."
        }
        actions={
          <Button type="button" onClick={() => setInviteOpen(true)}>
            Invite team member
          </Button>
        }
      />
      <div
        role="tablist"
        aria-label="Team management views"
        className="flex gap-2 border-b border-[var(--color-border)]"
      >
        <Button
          type="button"
          role="tab"
          aria-selected={view === "members"}
          variant={view === "members" ? "primary" : "ghost"}
          onClick={() => changeView("members")}
        >
          Team members
        </Button>
        <Button
          type="button"
          role="tab"
          aria-selected={view === "invitations"}
          variant={view === "invitations" ? "primary" : "ghost"}
          onClick={() => changeView("invitations")}
        >
          Invitations
        </Button>
      </div>
      <TeamSearchFilterControls
        key={search}
        search={search}
        onSearch={onSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />
      {query.isError ? (
        <ErrorState
          title="Unable to load team members"
          description={getApiErrorMessage(query.error)}
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading ? (
        <LoadingState
          label="Loading team members"
          message="Loading Owner-scoped team records…"
        />
      ) : query.data && query.data.count === 0 ? (
        <EmptyState
          title={view === "invitations" ? "No invitations found" : "No team members"}
          description={emptyDescription}
          action={
            <Button type="button" onClick={() => setInviteOpen(true)}>
              Invite team member
            </Button>
          }
        />
      ) : view === "invitations" ? (
        <InvitationManagementPage
          members={members}
          isMutating={updateBusy}
          onResend={(member) => void handleResend(member)}
          onRevoke={setMemberToRevoke}
        />
      ) : (
        <DataTable
          ariaLabel="Team members"
          columns={memberColumns}
          data={members}
          getRowId={(member) => member.id}
          emptyMessage="No team members match these filters."
        />
      )}
      {!query.isError && !query.isLoading && (query.data?.count ?? 0) > 0 && (
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          totalItems={query.data?.count ?? 0}
          onPageChange={changePage}
        />
      )}
      <TeamInvitationFormModal
        open={inviteOpen}
        isSaving={createInvitation.isPending}
        onClose={() => setInviteOpen(false)}
        onSubmit={submitInvitation}
      />
      <ConfirmDialog
        open={memberToRevoke !== null}
        title="Revoke team invitation?"
        description={
          <>
            Revoking this invitation deactivates this Owner&apos;s membership
            and suspends the member&apos;s assignments on your properties. Their
            account and memberships with other Owners are not changed.
          </>
        }
        confirmLabel="Revoke invitation"
        confirmVariant="danger"
        isLoading={revokeInvitation.isPending}
        onClose={() => setMemberToRevoke(null)}
        onConfirm={() => void handleRevoke()}
      />
    </div>
  );
}
