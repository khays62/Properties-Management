import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../../services/api", () => ({
  api: { get, post },
}));

import {
  createLease,
  fetchLeases,
  renewLease,
  transitionLease,
} from "../api/leases.api";

const lease = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  tenant: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  unit: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
  application: "c91a356a-a436-4ee9-9676-f4312469a834",
  start_date: "2026-12-01",
  end_date: "2027-12-01",
  monthly_rent: "800.00",
  deposit_amount: "800.00",
  payment_due_day: 1,
  status: "DRAFT",
  approved_by: null,
  approved_at: null,
  notes: "",
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
};

const leaseDetails = {
  ...lease,
  status_history: [
    {
      id: "4e82f780-2174-4d86-b37f-047b846d6b3f",
      old_status: "",
      new_status: "DRAFT",
      changed_by: null,
      change_reason: "Lease created from an approved application.",
      created_at: "2026-11-26T00:00:00Z",
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("leases API", () => {
  it("sends the backend-supported lease filters", async () => {
    get.mockResolvedValue({
      data: { count: 1, results: [leaseDetails] },
    });

    await expect(
      fetchLeases({
        status: "ACTIVE",
        tenant: lease.tenant,
        property: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
        unit: lease.unit,
        start_date: "2026-12-01",
        end_date: "2027-12-01",
        search: "Amina",
        page: 2,
      }),
    ).resolves.toMatchObject({ count: 1 });

    expect(get).toHaveBeenCalledWith("leases/", {
      params: {
        page_size: 20,
        status: "ACTIVE",
        tenant: lease.tenant,
        property: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
        unit: lease.unit,
        start_date: "2026-12-01",
        end_date: "2027-12-01",
        search: "Amina",
        page: 2,
      },
    });
  });

  it("creates a lease using the approved application and contract fields", async () => {
    const input = {
      application: lease.application,
      start_date: lease.start_date,
      end_date: lease.end_date,
      monthly_rent: "800.00",
      deposit_amount: "800.00",
      payment_due_day: 1,
      notes: "",
    };
    post.mockResolvedValue({ data: lease });

    await expect(createLease(input)).resolves.toMatchObject({
      status: "DRAFT",
    });
    expect(post).toHaveBeenCalledWith("leases/", input);
  });

  it("uses only the supported lease transition and renewal endpoints", async () => {
    post
      .mockResolvedValueOnce({
        data: { ...leaseDetails, status: "PENDING_APPROVAL" },
      })
      .mockResolvedValueOnce({
        data: { ...leaseDetails, status: "PENDING_APPROVAL" },
      });

    await transitionLease(lease.id, "submit-for-approval");
    await renewLease(lease.id, { new_end_date: "2028-12-01" });

    expect(post).toHaveBeenNthCalledWith(
      1,
      `leases/${lease.id}/submit-for-approval/`,
      {},
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      `leases/${lease.id}/renew/`,
      { new_end_date: "2028-12-01" },
    );
  });
});
