import { describe, expect, it } from "vitest";

import {
  addDaysToDate,
  getLeaseAvailableActions,
  isLeaseStatus,
} from "../utils/transitions";

describe("lease action availability", () => {
  it("only exposes actions supported for each lease status", () => {
    expect(
      getLeaseAvailableActions({
        status: "DRAFT",
        end_date: "2026-12-31",
      }),
    ).toEqual(["submit-for-approval"]);
    expect(
      getLeaseAvailableActions({
        status: "PENDING_APPROVAL",
        end_date: "2026-12-31",
      }),
    ).toEqual(["approve"]);
    expect(
      getLeaseAvailableActions({
        status: "APPROVED",
        end_date: "2026-12-31",
      }),
    ).toEqual(["activate"]);
    expect(
      getLeaseAvailableActions(
        { status: "ACTIVE", end_date: "2026-12-31" },
        "2026-12-31",
      ),
    ).toEqual(["renew", "terminate"]);
    expect(
      getLeaseAvailableActions(
        { status: "EXPIRING", end_date: "2026-12-30" },
        "2026-12-31",
      ),
    ).toEqual(["renew", "terminate", "expire"]);
    expect(
      getLeaseAvailableActions({
        status: "RENEWED",
        end_date: "2026-12-31",
      }),
    ).toEqual([]);
  });

  it("recognizes backend status values and computes renewal date limits", () => {
    expect(isLeaseStatus("PENDING_APPROVAL")).toBe(true);
    expect(isLeaseStatus("CANCELLED")).toBe(false);
    expect(addDaysToDate("2026-12-31", 2)).toBe("2027-01-02");
  });
});
