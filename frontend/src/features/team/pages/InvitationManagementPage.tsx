import { Link } from "react-router-dom";

import {
  DataTable,
  type DataTableColumn,
} from "../../../components/data";
import { ActionDropdown } from "../../../components/overlays/ActionDropdown";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import type { TeamMember } from "../types/team";
import { formatTeamDate, formatTeamRole } from "../utils/teamFormat";

interface InvitationManagementPageProps {
  members: readonly TeamMember[];
  isMutating: boolean;
  onResend: (member: TeamMember) => void;
  onRevoke: (member: TeamMember) => void;
}

export function InvitationManagementPage({
  isMutating,
  members,
  onResend,
  onRevoke,
}: InvitationManagementPageProps) {
  const columns: DataTableColumn<TeamMember>[] = [
    {
      id: "member",
      header: "Team member",
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
      id: "invitation_status",
      header: "Invitation status",
      sortValue: (member) => member.invitation?.status,
      render: (member) =>
        member.invitation ? (
          <StatusBadge status={member.invitation.status} />
        ) : (
          <span className="text-text-secondary">No invitation</span>
        ),
    },
    {
      id: "expires_at",
      header: "Expires",
      sortValue: (member) => member.invitation?.expires_at,
      render: (member) => formatTeamDate(member.invitation?.expires_at ?? null),
    },
    {
      id: "actions",
      header: "Actions",
      sortable: false,
      render: (member) => {
        const canManage =
          member.invitation &&
          ["PENDING", "EXPIRED"].includes(member.invitation.status);
        if (!canManage || !member.invitation) {
          return <span className="text-text-secondary">—</span>;
        }
        return (
          <ActionDropdown
            label={`Invitation actions for ${member.full_name}`}
            items={[
              {
                id: "resend",
                label: "Resend invitation",
                disabled: isMutating,
                onSelect: () => onResend(member),
              },
              {
                id: "revoke",
                label: "Revoke invitation",
                variant: "danger",
                disabled: isMutating,
                onSelect: () => onRevoke(member),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <DataTable
      ariaLabel="Team invitations"
      columns={columns}
      data={members}
      getRowId={(member) => member.id}
      emptyMessage="No team members match these invitation filters."
    />
  );
}
