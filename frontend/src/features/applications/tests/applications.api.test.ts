import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../../services/api", () => ({
  api: { get, post },
}));

import {
  fetchApplications,
  rejectApplication,
  transitionApplication,
  transitionScreening,
} from "../api/applications.api";

const application = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  listing: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  applicant: {
    id: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
    first_name: "Amina",
    last_name: "Applicant",
    email: "amina@example.com",
    phone: "+252610000000",
    employment_status: "EMPLOYED",
    employer_name: "Example Employer",
    monthly_income: "1500.00",
    current_address: "Mogadishu",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  move_in_date: "2026-12-01",
  notes: "",
  rejection_reason: "",
  status: "SUBMITTED",
  submitted_at: "2026-11-01T00:00:00Z",
  created_at: "2026-11-01T00:00:00Z",
  updated_at: "2026-11-01T00:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applications API", () => {
  it("requests only backend-supported application filters", async () => {
    get.mockResolvedValue({
      data: { count: 1, results: [application] },
    });

    await expect(
      fetchApplications({
        status: "SUBMITTED",
        listing: application.listing,
        property: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
        city: "Mogadishu",
        date: "2026-11-01",
        search: "Amina",
        page: 2,
      }),
    ).resolves.toMatchObject({ count: 1 });

    expect(get).toHaveBeenCalledWith("applications/", {
      params: {
        page_size: 20,
        status: "SUBMITTED",
        listing: application.listing,
        property: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
        city: "Mogadishu",
        date: "2026-11-01",
        search: "Amina",
        page: 2,
      },
    });
  });

  it("uses the application workflow endpoint without sending a status", async () => {
    post.mockResolvedValue({ data: { ...application, status: "UNDER_REVIEW" } });

    await expect(
      transitionApplication(application.id, "review"),
    ).resolves.toMatchObject({ status: "UNDER_REVIEW" });
    expect(post).toHaveBeenCalledWith(
      `applications/${application.id}/review/`,
      {},
    );
  });

  it("sends a rejection reason and screening results to their supported endpoints", async () => {
    post
      .mockResolvedValueOnce({
        data: { ...application, status: "REJECTED", rejection_reason: "Not qualified" },
      })
      .mockResolvedValueOnce({
        data: {
          id: "f3bffedc-8a27-4d4b-bbe8-8c7265db3d0c",
          application: application.id,
          score: 82,
          notes: "",
          income_verified: true,
          employment_verified: true,
          references_checked: true,
          status: "PASSED",
          reviewed_by: null,
          reviewed_at: "2026-11-01T00:00:00Z",
          created_at: "2026-11-01T00:00:00Z",
          updated_at: "2026-11-01T00:00:00Z",
        },
      });

    await rejectApplication(application.id, "Not qualified");
    await transitionScreening("f3bffedc-8a27-4d4b-bbe8-8c7265db3d0c", "pass", {
      score: 82,
      income_verified: true,
      employment_verified: true,
      references_checked: true,
    });

    expect(post).toHaveBeenNthCalledWith(
      1,
      `applications/${application.id}/reject/`,
      { rejection_reason: "Not qualified" },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "screenings/f3bffedc-8a27-4d4b-bbe8-8c7265db3d0c/pass/",
      {
        score: 82,
        income_verified: true,
        employment_verified: true,
        references_checked: true,
      },
    );
  });
});
