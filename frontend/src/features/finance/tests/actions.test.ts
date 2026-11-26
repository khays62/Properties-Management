import { describe, expect, it } from "vitest";

import { getDepositActions, getPaymentActions } from "../utils/actions";
import type { Deposit, PaymentDetails } from "../types/finance";

const deposit = (status: Deposit["status"], paid = "0.00"): Deposit => ({
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  lease: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  required_amount: "800.00",
  paid_amount: paid,
  reference_number: null,
  payment_date: null,
  payment_method: null,
  status,
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
});

const payment = (status: PaymentDetails["status"]): PaymentDetails => ({
  id: "c5513a82-c7b3-41bd-bdae-9e7a70c6e8ac",
  tenant: "6de0f86d-23a9-4ad3-98d7-c1f29c9ea42b",
  amount: "800.00",
  payment_date: "2026-11-26",
  reference_number: "PAY-001",
  payment_method: "CASH",
  notes: "",
  status,
  created_at: "2026-11-26T00:00:00Z",
  updated_at: "2026-11-26T00:00:00Z",
  allocations: [],
});

describe("Finance action availability", () => {
  it("only exposes deposit actions supported for its status", () => {
    expect(getDepositActions(deposit("PENDING"))).toEqual(["record-payment"]);
    expect(getDepositActions(deposit("PARTIALLY_PAID", "200.00"))).toEqual([
      "record-payment",
      "refund",
      "forfeit",
    ]);
    expect(getDepositActions(deposit("PAID", "800.00"))).toEqual([
      "refund",
      "forfeit",
    ]);
    expect(getDepositActions(deposit("REFUNDED"))).toEqual([]);
    expect(getDepositActions(deposit("FORFEITED", "800.00"))).toEqual([]);
  });

  it("only allows pending allocation and completed payment reversal", () => {
    expect(getPaymentActions(payment("PENDING"))).toEqual(["allocate"]);
    expect(getPaymentActions(payment("COMPLETED"))).toEqual(["reverse"]);
    expect(getPaymentActions(payment("FAILED"))).toEqual([]);
    expect(getPaymentActions(payment("REVERSED"))).toEqual([]);
  });
});
