import { beforeEach, describe, expect, it, vi } from "vitest";

const { get, post } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock("../../../services/api", () => ({
  api: { get, post },
}));

import {
  allocatePayment,
  createDeposit,
  fetchPayments,
  fetchRentCharges,
  issueRentChargeInvoice,
} from "../api/finance.api";

const charge = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  lease: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  tenant: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
  invoice_number: null,
  billing_month: 11,
  billing_year: 2026,
  amount: "800.00",
  balance: "800.00",
  due_date: "2026-11-26",
  status: "PENDING",
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
};

const payment = {
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  tenant: "996b7f24-8762-4c08-86e4-6835ed59a5e5",
  amount: "800.00",
  payment_date: "2026-11-26",
  reference_number: "PAY-001",
  payment_method: "CASH",
  notes: "",
  status: "PENDING",
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
  allocations: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Finance API", () => {
  it("requests only backend-supported rent charge filters", async () => {
    get.mockResolvedValue({
      data: { count: 1, results: [charge] },
    });

    await expect(
      fetchRentCharges({
        status: "PENDING",
        tenant: charge.tenant,
        lease: charge.lease,
        billing_month: 11,
        billing_year: 2026,
        search: "Amina",
        page: 2,
      }),
    ).resolves.toMatchObject({ count: 1, results: [{ id: charge.id }] });

    expect(get).toHaveBeenCalledWith("rent-charges/", {
      params: {
        status: "PENDING",
        tenant: charge.tenant,
        lease: charge.lease,
        billing_month: 11,
        billing_year: 2026,
        search: "Amina",
        page: 2,
      },
    });
  });

  it("creates deposits and allocates payments only through supported endpoints", async () => {
    post
      .mockResolvedValueOnce({
        data: {
          id: charge.id,
          lease: charge.lease,
          required_amount: "800.00",
          paid_amount: "0.00",
          reference_number: null,
          payment_date: null,
          payment_method: null,
          status: "PENDING",
          created_at: "2026-11-26T00:00:00Z",
          updated_at: "2026-11-26T00:00:00Z",
        },
      })
      .mockResolvedValueOnce({ data: { ...payment, status: "COMPLETED" } });

    await createDeposit({ lease: charge.lease });
    await allocatePayment(payment.id, {
      allocations: [
        { rent_charge: charge.id, amount_allocated: "800.00" },
      ],
    });

    expect(post).toHaveBeenNthCalledWith(1, "deposits/", {
      lease: charge.lease,
    });
    expect(post).toHaveBeenNthCalledWith(
      2,
      `payments/${payment.id}/allocate/`,
      {
        allocations: [
          { rent_charge: charge.id, amount_allocated: "800.00" },
        ],
      },
    );
  });

  it("parses payment detail allocations and invoice issue response", async () => {
    get.mockResolvedValue({
      data: { count: 1, results: [{ ...payment, allocations: [] }] },
    });
    await expect(fetchPayments({ status: "PENDING" })).resolves.toMatchObject({
      results: [{ status: "PENDING", allocations: [] }],
    });

    post.mockResolvedValue({
      data: {
        id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
        rent_charge: charge.id,
        invoice_number: "INV-C5513A82C7B341BD",
        issued_date: "2026-11-26",
      },
    });
    await expect(issueRentChargeInvoice(charge.id)).resolves.toMatchObject({
      rent_charge: charge.id,
      invoice_number: "INV-C5513A82C7B341BD",
    });
  });
});
