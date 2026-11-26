import { describe, expect, it } from "vitest";

import {
  getApplicationAvailableActions,
  getScreeningAvailableActions,
} from "../utils/transitions";

describe("application action availability", () => {
  it("only exposes actions allowed for each application state", () => {
    expect(getApplicationAvailableActions("SUBMITTED")).toEqual([
      "review",
      "withdraw",
    ]);
    expect(getApplicationAvailableActions("UNDER_REVIEW")).toEqual([
      "start-screening",
      "withdraw",
    ]);
    expect(getApplicationAvailableActions("SCREENING")).toEqual(["reject"]);
    expect(getApplicationAvailableActions("SCREENING", "PASSED")).toEqual([
      "approve",
      "reject",
    ]);
    expect(getApplicationAvailableActions("APPROVED")).toEqual([]);
    expect(getApplicationAvailableActions("REJECTED")).toEqual([]);
    expect(getApplicationAvailableActions("WITHDRAWN")).toEqual([]);
  });

  it("only exposes screening steps allowed for each screening state", () => {
    expect(getScreeningAvailableActions("PENDING")).toEqual(["start"]);
    expect(getScreeningAvailableActions("IN_PROGRESS")).toEqual([
      "pass",
      "fail",
    ]);
    expect(getScreeningAvailableActions("PASSED")).toEqual([]);
    expect(getScreeningAvailableActions("FAILED")).toEqual([]);
    expect(getScreeningAvailableActions("NEEDS_REVIEW")).toEqual([]);
  });
});
