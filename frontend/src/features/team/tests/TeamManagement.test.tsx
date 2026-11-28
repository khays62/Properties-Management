import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  useAcceptTeamInvitation: vi.fn(),
  useCreateTeamInvitation: vi.fn(),
  useDeactivateTeamMember: vi.fn(),
  useReactivateTeamMember: vi.fn(),
  useResendTeamInvitation: vi.fn(),
  useRevokeTeamInvitation: vi.fn(),
  useTeamMember: vi.fn(),
  useTeamMembers: vi.fn(),
}));

vi.mock("../hooks/useTeam", () => ({
  useAcceptTeamInvitation: mocks.useAcceptTeamInvitation,
  useCreateTeamInvitation: mocks.useCreateTeamInvitation,
  useDeactivateTeamMember: mocks.useDeactivateTeamMember,
  useReactivateTeamMember: mocks.useReactivateTeamMember,
  useResendTeamInvitation: mocks.useResendTeamInvitation,
  useRevokeTeamInvitation: mocks.useRevokeTeamInvitation,
  useTeamMember: mocks.useTeamMember,
  useTeamMembers: mocks.useTeamMembers,
}));

import { TeamInvitationAcceptPage } from "../pages/TeamInvitationAcceptPage";
import { TeamListPage } from "../pages/TeamListPage";
import { TeamMemberDetailsPage } from "../pages/TeamMemberDetailsPage";

const member = {
  id: "72a1e2d4-0b28-4511-8f66-df3f49a86c46",
  first_name: "Hodan",
  last_name: "Manager",
  full_name: "Hodan Manager",
  email: "hodan@example.com",
  role: "PROPERTY_MANAGER" as const,
  status: "PENDING" as const,
  created_at: "2026-03-10T09:00:00Z",
  assignment_count: 1,
  invitation: {
    id: "339d2faa-8326-4dcf-b035-3cf087c8f699",
    status: "PENDING" as const,
    expires_at: "2026-03-20T09:00:00Z",
    created_at: "2026-03-10T09:00:00Z",
  },
};

const memberDetails = {
  ...member,
  assignments: [
    {
      property_id: "2f664384-d721-4b2c-aaf0-b5f255535843",
      property_name: "Waberi Apartments",
      property_city: "Mogadishu",
      assigned_date: "2026-03-10",
      is_active: true,
    },
  ],
};

const invitation = {
  id: member.invitation.id,
  user: member.id,
  email: member.email,
  role: member.role,
  invited_by: "1efb37f3-0dd0-48f8-acfd-0c58065ef5d0",
  status: "PENDING" as const,
  expires_at: member.invitation.expires_at,
  accepted_at: null,
  created_at: member.invitation.created_at,
};

function renderTeamPage(path = "/team") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/team" element={<TeamListPage />} />
        <Route path="/team/:memberId" element={<TeamMemberDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.useTeamMembers.mockReturnValue({
    data: { count: 1, results: [member] },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useTeamMember.mockReturnValue({
    data: memberDetails,
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
  mocks.useCreateTeamInvitation.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue(invitation),
  });
  mocks.useResendTeamInvitation.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue(invitation),
  });
  mocks.useRevokeTeamInvitation.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue({ ...invitation, status: "REVOKED" }),
  });
  mocks.useDeactivateTeamMember.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue(memberDetails),
  });
  mocks.useReactivateTeamMember.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue(memberDetails),
  });
  mocks.useAcceptTeamInvitation.mockReturnValue({
    isPending: false,
    mutateAsync: vi.fn().mockResolvedValue(invitation),
  });
});

afterEach(() => cleanup());

describe("Team management pages", () => {
  it("shows backend team directory fields and the invitation state", () => {
    renderTeamPage();

    expect(screen.getByRole("table", { name: "Team members" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Hodan Manager" })).toHaveAttribute(
      "href",
      `/team/${member.id}`,
    );
    expect(screen.getByText("hodan@example.com")).toBeVisible();
    const table = screen.getByRole("table", { name: "Team members" });
    expect(within(table).getByText("Property Manager")).toBeVisible();
    expect(within(table).getAllByText("Pending")).toHaveLength(2);
    expect(within(table).getByText("1")).toBeVisible();
  });

  it("filters the directory with backend role and status parameters", async () => {
    renderTeamPage();
    fireEvent.change(screen.getByLabelText("Role"), {
      target: { value: "ACCOUNTANT" },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "ACTIVE" },
    });

    await waitFor(() =>
      expect(mocks.useTeamMembers).toHaveBeenLastCalledWith({
        page: 1,
        page_size: 20,
        role: "ACCOUNTANT",
        status: "ACTIVE",
      }),
    );
  });

  it("offers an invitation action when the directory is empty", () => {
    mocks.useTeamMembers.mockReturnValue({
      data: { count: 0, results: [] },
      error: null,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    renderTeamPage();

    expect(screen.getByRole("heading", { name: "No team members" })).toBeVisible();
    expect(
      screen.getByText(
        "Invite a Property Manager or Accountant to give them access to your team.",
      ),
    ).toBeVisible();
    expect(
      screen.getAllByRole("button", { name: "Invite team member" }),
    ).toHaveLength(2);
  });

  it("creates an invitation using only the two backend-supported staff roles", async () => {
    renderTeamPage();
    fireEvent.click(screen.getByRole("button", { name: "Invite team member" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByRole("option", { name: "Property Manager" }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("option", { name: "Accountant" }),
    ).toBeVisible();
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new-accountant@example.com" },
    });
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Amina" },
    });
    fireEvent.change(within(dialog).getByLabelText("Role"), {
      target: { value: "ACCOUNTANT" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send invitation" }));

    await waitFor(() =>
      expect(
        mocks.useCreateTeamInvitation.mock.results[0].value.mutateAsync,
      ).toHaveBeenCalledWith({
        email: "new-accountant@example.com",
        first_name: "Amina",
        last_name: "",
        role: "ACCOUNTANT",
      }),
    );
  });

  it("resends or revokes pending invitations from the invitation view", async () => {
    renderTeamPage();
    fireEvent.click(screen.getByRole("tab", { name: "Invitations" }));

    expect(screen.getByRole("table", { name: "Team invitations" })).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", {
        name: `Invitation actions for ${member.full_name}`,
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Resend invitation" }));
    await waitFor(() =>
      expect(
        mocks.useResendTeamInvitation.mock.results[0].value.mutateAsync,
      ).toHaveBeenCalledWith(member.invitation.id),
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: `Invitation actions for ${member.full_name}`,
      }),
    );
    fireEvent.click(screen.getByRole("menuitem", { name: "Revoke invitation" }));
    fireEvent.click(screen.getByRole("button", { name: "Revoke invitation" }));
    await waitFor(() =>
      expect(
        mocks.useRevokeTeamInvitation.mock.results[0].value.mutateAsync,
      ).toHaveBeenCalledWith(member.invitation.id),
    );
  });

  it("shows Owner-scoped assignments and deactivates membership rather than the account", async () => {
    renderTeamPage(`/team/${member.id}`);

    expect(screen.getByRole("heading", { name: "Property assignments" })).toBeVisible();
    expect(screen.getByText("Waberi Apartments")).toBeVisible();
    fireEvent.click(
      screen.getByRole("button", { name: "Deactivate membership" }),
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Deactivate membership" })[1],
    );

    await waitFor(() =>
      expect(
        mocks.useDeactivateTeamMember.mock.results[0].value.mutateAsync,
      ).toHaveBeenCalledWith(member.id),
    );
  });

  it("reactivates an Owner-scoped membership", async () => {
    mocks.useTeamMember.mockReturnValue({
      data: { ...memberDetails, status: "INACTIVE" },
      error: null,
      isError: false,
      isLoading: false,
      refetch: vi.fn(),
    });
    renderTeamPage(`/team/${member.id}`);

    fireEvent.click(
      screen.getByRole("button", { name: "Reactivate membership" }),
    );
    fireEvent.click(
      screen.getAllByRole("button", { name: "Reactivate membership" })[1],
    );
    await waitFor(() =>
      expect(
        mocks.useReactivateTeamMember.mock.results[0].value.mutateAsync,
      ).toHaveBeenCalledWith(member.id),
    );
  });
});

describe("Team invitation acceptance", () => {
  it("submits the email-link invitation token and new password", async () => {
    const accept = vi.fn().mockResolvedValue(invitation);
    mocks.useAcceptTeamInvitation.mockReturnValue({
      isPending: false,
      mutateAsync: accept,
    });
    render(
      <MemoryRouter
        initialEntries={[
          `/team/accept-invitation/?invitation=${invitation.id}&token=secure-token`,
        ]}
      >
        <Routes>
          <Route
            path="/team/accept-invitation"
            element={<TeamInvitationAcceptPage />}
          />
          <Route path="/login" element={<h1>Sign in</h1>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("New password"), {
      target: { value: "Unique-Password-9031" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Unique-Password-9031" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Accept invitation" }));

    await waitFor(() =>
      expect(accept).toHaveBeenCalledWith({
        invitation: invitation.id,
        token: "secure-token",
        new_password: "Unique-Password-9031",
      }),
    );
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeVisible();
  });
});
